import OpenAI from 'openai';
import {
  Client,
  ChatCompletionEvents,
  Options,
  Message,
} from './types/globals';
import { uuid } from 'uuidv4';
import assistantController from '../src/controllers/assistantController';

class AISocketHandler {
  /**
   *  OpenAI official client
   */
  public openai: OpenAI;


  /**
   * Configures the socket listeners for AI related operations.
   * @param {Server} io - Socket.io server.
   * @param {Options} options - Options for the OpenAISocket.
   */
  constructor(
    public client: Client,
    public options: Options = {
      verbose: false,
      chat: { model: 'gpt-3.5-turbo' },
      initMessages: [
        { role: 'system', content: 'You are a helpful assistant.' },
      ],
    },
    public clients: Map<string, Client>,
  ) {
    this.openai = new OpenAI(this.options.client);
    client.data.chat = this.options.chat;
    client.data.initMessages = this.options.initMessages;

    client.on('new-message', async (message, workspaceId, chatHistory) => await this.onNewMessage(client, message, workspaceId, chatHistory));

    client.on('set-options', (options) => {
      if (options.chat) client.data.chat = options.chat;
      if (options.initMessages)
        client.data.initMessages = options.initMessages;
    });

    client.on('abort', () => {
      if (client.data.currentChatStream) {
        client.data.currentChatStream.controller.abort();
        client.data.currentChatStream = undefined;
      }
    });
  }

  /**
   * Handles a new message received from a client.
   *
   * @param {Client} client - The client object.
   * @param {string | Message} message - The message received from the client.
   * @return {void} This function does not return anything.
   */
  async onNewMessage(client: Client, message: string | Message, workspaceId: string, chatHistory: Message[]): Promise<void> { 
    if (typeof message === 'object') {
      chatHistory.push(message);
    } else {
      chatHistory.push({
        role: 'user',
        content: message,
      })
      this.logger(`Workspace ID: ${workspaceId}`);
      const userMessageId = uuid();
      client.emit('retrieve-user-message', userMessageId, message, workspaceId);
      
      try {
        await assistantController.insertChatHistory(
          {
            role: 'user',
            content: message,
          }, 
          userMessageId, 
          workspaceId
        );
      }
      catch (error) {
        console.error('Error inserting chat history:', error);
      }
    }

    this.logger(`Chat history: \n${JSON.stringify(chatHistory, null, 2)}`);

    this.processNewMessage(client, workspaceId, chatHistory);
  }

  /**
   * Process a new message from the client.
   *
   * @param {Client} client - The client object.
   * @return {void} This function does not return anything.
   */
  private processNewMessage(client: Client, workspaceId: string, chatHistory: Message[]): void {
    const { id, data } = client;

    client.data.currentChatStream = this.openai.beta.chat.completions.stream({
      ...client.data.chat,
      messages: [...data.initMessages, ...chatHistory],
    });
    
    const assistantMessageId = uuid();
    client.emit('retrieve-assistant-message', assistantMessageId, workspaceId);

    const streamHandlers = {
      content: (contentDelta, contentSnapshot) =>
        client.emit('content', contentDelta, contentSnapshot, assistantMessageId, workspaceId),
      finalContent: (contentSnapshot) =>
        client.emit('finalContent', contentSnapshot, workspaceId),
      chunk: (chunk, snapshot) => client.emit('chunk', chunk, snapshot, workspaceId),
      chatCompletion: (completion) => client.emit('chatCompletion', completion, workspaceId),
      finalChatCompletion: (completion) =>
        client.emit('finalChatCompletion', completion, workspaceId),
      message: (message) => client.emit('message', message, workspaceId),
      finalMessage: async (message) => {
        // this.pushToChatHistory(id, message);
        client.emit('finalMessage', message, workspaceId);
        try {
          await assistantController.insertChatHistory(
            message,
            uuid(), 
            workspaceId
          );
        }
        catch (error) {
          console.error('Error inserting chat history:', error);
        }
      },
      functionCall: (functionCall) => client.emit('functionCall', functionCall, workspaceId),
      finalFunctionCall: (finalFunctionCall) =>
        client.emit('finalFunctionCall', finalFunctionCall, workspaceId),
      functionCallResult: (finalFunctionCallResult) =>
        client.emit('finalFunctionCallResult', finalFunctionCallResult, workspaceId),
      finalFunctionCallResult: (finalFunctionCallResult, workspaceId) =>
        client.emit('finalFunctionCallResult', finalFunctionCallResult, workspaceId),
      totalUsage: (usage) => client.emit('totalUsage', usage, workspaceId),
      error: (error) => {
        client.emit('error', error, workspaceId);
        client.data.currentChatStream = undefined;
      },
      end: () => {
        client.emit('end', workspaceId);
        client.emit('debug-log', JSON.stringify({ workspaceId: workspaceId, chatHistory: chatHistory}))
        client.data.currentChatStream = undefined;
      },
    } as ChatCompletionEvents;

    Object.entries(streamHandlers).forEach(([event, handler]) => {
      client.data.currentChatStream?.on(
        event as keyof typeof streamHandlers,
        (...args: any) => {
          // this.logger(
          //   `Event: ${event}, Args: ${JSON.stringify(args, null, 2)}`,
          // );
          handler(...args);
        },
      );
    });
  }

  /**
   *  Logs a message if the verbose option is set to true.
   * @param {string} message
   * @returns {void}
   */
    logger(message: string): void {
      console.debug(`[AISocketHandler] ${message}`);
    }
}

export default AISocketHandler;