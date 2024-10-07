import OpenAI from 'openai';
import {
  Client,
  ChatCompletionEvents,
  Options,
  Message,
  WorkspaceMessagesBuffer,
  WorkspaceMessageKey,
  WorkspaceMessagesProxy,
  WorkspaceModulesProxy,
  Module,
  ModuleNode,
  WorkspaceModuleKey,
} from './types/globals';
import { uuid } from 'uuidv4';
import assistantController from '../src/controllers/assistantController';
import { calculateTokens4o_mini, commandDecomposition, commandTypeEnum, createModuleOutline, generateModuleOutlineResponse, intentDecomposition, IntentTypeEnum, ModuleNodeOutline, ModuleOutline } from './utils/ai/ai-utils';
import express from "express";
import { ChatCompletionMessageParam } from 'openai/resources';
import { copy } from '@vercel/blob';
import { serializeTuple } from './socketServer';
import moduleController from './controllers/moduleController';
import { getContext } from './utils/context';
import { chunkAndEmbedFile } from './utils/documentProcessor';
import documentController from "./controllers/documentController";

enum MessageType {
  Standard = "standard",
  Action = "action"
}

class AISocketHandler {
  public openai: OpenAI;

  constructor(
    public client: Client,
    public options: Options = {
      verbose: false,
      chat: { model: 'gpt-4o-mini' },
      initMessages: [
        { role: 'system', content: 'You are a helpful assistant.' },
      ],
    },
    // public clients: Map<string, Client>,
    public workspaceMessagesBufferProxy: WorkspaceMessagesProxy,
    public workspaceModulesBufferProxy: WorkspaceModulesProxy,
  ) {
    this.openai = new OpenAI(this.options.client);
    client.data.chat = this.options.chat;
    client.data.initMessages = this.options.initMessages;

    
    // Standard user-assistant message events handling
    client.on('new-message', async (message, userId, workspaceId, chatHistory) => {
      // const assistantMessageId = uuid();
      // const tupleKey: WorkspaceMessageKey = [assistantMessageId, workspaceId];
      // const serializedKey = serializeTuple(tupleKey);
      // workspaceMessagesBufferProxy.set(serializedKey, ['Test', 'Test']);
      // workspaceMessagesBufferProxy.emit(serializedKey, 'debug-log', workspaceMessagesBufferProxy.get(serializedKey));
      // workspaceMessagesBufferProxy.emit(serializedKey, 'end');
      await this.onNewMessage(client, message, workspaceId, userId, chatHistory)
    });

    client.on('set-options', (options) => {
      if (options.chat) client.data.chat = options.chat;
      if (options.initMessages)
        client.data.initMessages = options.initMessages;
    });

    // TODO: Modify this so that all AI assistant operations over a workspace ID is terminated
    client.on('abort', () => { 
      if (client.data.currentChatStream) {
        client.data.currentChatStream.controller.abort();
        client.data.currentChatStream = undefined;
      }
    });

    client.on('module-outline-generation', async (confirmation, workspaceId, subject, context_instructions) => {
      if (confirmation) {
        const userMessageId = uuid();
        const actionNotificationDirective = `::action_notification{actionMessage="Module Outline Creation Confirmed"}`;
        client.emit('initialize-user-message', userMessageId, actionNotificationDirective, MessageType.Action, workspaceId);
      
        await assistantController.insertChatHistory(
          {
            role: 'user',
            content: actionNotificationDirective,
          },
          userMessageId,
          MessageType.Action,
          workspaceId
        );

        const assistantMessageId = uuid();
        client.emit('initialize-assistant-message', assistantMessageId, MessageType.Action, workspaceId);

        const moduleId = uuid();
        const moduleDirective = `:::module_outline{moduleId="${moduleId}" subject="${subject}" context_instructions="${context_instructions}"}\n:::`;
        client.emit('content', moduleDirective, moduleDirective as any, assistantMessageId, workspaceId);

        await assistantController.insertChatHistory(
          {
            role: 'assistant',
            content: moduleDirective,
          },
          assistantMessageId,
          MessageType.Action,
          workspaceId
        );

        client.emit('end', workspaceId);
      } else {
        const userMessageId = uuid();
        const actionNotificationDirective = `::action_notification{actionMessage="Module Creation Confirmed"}`;
        client.emit('initialize-user-message', userMessageId, actionNotificationDirective, MessageType.Action, workspaceId);
        client.emit('end', workspaceId);

        await assistantController.insertChatHistory(
          {
            role: 'user',
            content: actionNotificationDirective,
          },
          userMessageId,
          MessageType.Action,
          workspaceId
        );

        // Handle direct module outline generation without user confirmation
        let moduleOutlineData = await generateModuleOutlineResponse(this.openai, subject, context_instructions);

        const result = await moduleController.createModuleCallback(moduleOutlineData.name, moduleOutlineData.description, workspaceId);
        const rootNode = result.moduleId;
        
        // await moduleController.insertChildToModuleNodeCallback(rootNode!, rootNode!, null, "Some content for testing", "Test Module Node");

        await Promise.all(
          moduleOutlineData.moduleNodes.map(async (node: ModuleNodeOutline) => {
            await this.insertModuleNode(rootNode!, node, rootNode!);
          })
        );
        
        console.log("Module nodes of prev:", JSON.stringify(moduleOutlineData.moduleNodes, null, 2));

        client.emit('create-module', rootNode!, workspaceId, moduleOutlineData.name, moduleOutlineData.description, async (ack) => {
          if (ack === 'module-created') {
            console.log("Result", result);
    
            const serializedKey = serializeTuple([result.moduleId!, workspaceId]);
            console.log("Serialized key:", serializedKey);
    
            if (result.moduleId) {
              console.log("Creating module data");
              const serializedKey = serializeTuple([result.moduleId, workspaceId]);
      
              const moduleNodes: ModuleNode[] = moduleOutlineData.moduleNodes.map((moduleNodeOutline) => {
                const mapModuleNodeOutlineToModuleNode = (nodeOutline: ModuleNodeOutline, parentId: string): ModuleNode => {
                  return {
                    id: nodeOutline.id!,
                    parent: parentId,
                    title: nodeOutline.title,
                    content: '', 
                    description: nodeOutline.description,
                    children: nodeOutline.children
                      ? nodeOutline.children.map((childNode) => mapModuleNodeOutlineToModuleNode(childNode, nodeOutline.id!))
                      : [], // Recursively map children, if any
                  };
                };
              
                return mapModuleNodeOutlineToModuleNode(moduleNodeOutline, moduleOutlineData.id!); // Root-level parent id is moduleOutlineData.id
              });
              
              console.log("Module nodes:", JSON.stringify(moduleNodes, null, 2));
  
              const moduleBuffer: Module = {
                id: rootNode!,
                name: moduleOutlineData.name,
                description: moduleOutlineData.description,
                nodes: moduleNodes
              }
      
              workspaceModulesBufferProxy.set(serializedKey, moduleBuffer);
      
              let i = 0;
              for (const node of moduleNodes) {
                const traverseModuleNodes = async (
                  moduleId: string,
                  workspaceId: string,
                  node: ModuleNodeOutline
                ) => {
                  // Call generateModuleNodeContent for the current node sequentially
                  if (node.id) {
                    await this.generateModuleNodeContent(
                      moduleId,
                      node.id,
                      workspaceId,
                      node.title,
                      node.description,
                      subject,
                      context_instructions
                    );
                  }
              
                  // workspaceModulesBufferProxy.emit(serializedKey, 'update-module-node', moduleId, node.id, workspaceId, node.description, node.description);
                  
                  console.log("Iteration", i++);

                  // If this node has children, recursively call traverseModuleNodes for each child
                  if (node.children && node.children.length > 0) {
                    for (const childNode of node.children) {
                      await traverseModuleNodes(moduleId, workspaceId, childNode);
                    }
                  }
                };
              
                // Traverse each module node sequentially
                await traverseModuleNodes(rootNode!, workspaceId, node);
              }
              
              workspaceModulesBufferProxy.emit(serializedKey, 'end');
            }
          }
        });
      }
    });

    client.on('module-outline-inject-content', async(workspaceId, assistantMessageId, moduleId, subject, context_instructions) => {
      console.log('User requested to generate module outline');
      client.removeAllListeners('directive-ready');

      // Function to handle the directive-ready event
      const handleDirectiveReady = async (receivedAssistantMessageId: string, receivedWorkspaceId: string) => {
        if (receivedAssistantMessageId === assistantMessageId && receivedWorkspaceId === workspaceId) {
          // clearTimeout(timeoutId); // Clear the timeout since the correct event was received
  
          let moduleOutlineData = await generateModuleOutlineResponse(this.openai, subject, context_instructions);
          client.emit('module-outline-data', assistantMessageId, workspaceId, moduleId, JSON.stringify(moduleOutlineData));
          
          client.removeAllListeners('directive-ready');
          // attachConfirmModuleReponseListener(receivedAssistantMessageId, receivedWorkspaceId, handleDirectiveReady);
        } else {
          console.warn('Received directive-ready event with mismatched assistantMessageId or workspaceId');
          // client.once('directive-ready', handleDirectiveReady);
        }
      };
  
      client.once('directive-ready', handleDirectiveReady);
    });

    client.on('confirm-module-outline-response', async(action, workspaceId, moduleId, module, subject, context_instructions) => {
      if (action === 'submit') {
        console.log('User accepted the module outline');
        const userMessageId = uuid();
        const actionNotificationDirective = `::action_notification{actionMessage="Module Outline Accepted by User"}`;
        client.emit('initialize-user-message', userMessageId, actionNotificationDirective, MessageType.Action, workspaceId);
        
        await assistantController.insertChatHistory(
          {
            role: 'user',
            content: actionNotificationDirective,
          },
          userMessageId,
          MessageType.Action,
          workspaceId
        );

        const result = await moduleController.createModuleCallback(module.name, module.description, workspaceId, moduleId);
        const rootNode = result.moduleId;
        
        // await moduleController.insertChildToModuleNodeCallback(rootNode!, rootNode!, null, "Some content for testing", "Test Module Node");

        await Promise.all(
          module.nodes.map(async (node: ModuleNodeOutline) => {
            await this.insertModuleNode(rootNode!, node, rootNode!);
          })
        );

        client.emit('create-module', moduleId!, workspaceId, module.name, module.description, async (ack) => {
          if (ack === 'module-created') {
            // Proceed with the accepted module outline 
            console.log("Module outline data", module);
    
            const serializedKey = serializeTuple([moduleId, workspaceId]);
            
            const moduleBuffer: Module = {
              id: moduleId,
              name: module.name,
              description: module.description,
              nodes: module.nodes
            }
    
            workspaceModulesBufferProxy.set(serializedKey, moduleBuffer);
    
            let i = 0;
            for (const node of module.nodes) {
              const traverseModuleNodes = async (
                moduleId: string,
                workspaceId: string,
                node: ModuleNodeOutline
              ) => {
                // Call generateModuleNodeContent for the current node sequentially
                if (node.id) {
                  await this.generateModuleNodeContent(
                    moduleId,
                    node.id,
                    workspaceId,
                    node.title,
                    node.description,
                    subject,
                    context_instructions
                  );
                }
            
                // workspaceModulesBufferProxy.emit(serializedKey, 'update-module-node', moduleId, node.id, workspaceId, node.description, node.description);
                
                console.log("Iteration", i++);
    
                // If this node has children, recursively call traverseModuleNodes for each child
                if (node.children && node.children.length > 0) {
                  for (const childNode of node.children) {
                    await traverseModuleNodes(moduleId, workspaceId, childNode);
                  }
                }
              };
            
              // Traverse each module node sequentially
              await traverseModuleNodes(moduleId, workspaceId, node);
            }
            
            workspaceModulesBufferProxy.emit(serializedKey, 'end');
          }
        })

      } else if (action === 'cancel') {
        console.log('User canceled the module outline generation');
        const userMessageId = uuid();
        const actionNotificationDirective = `::action_notification{actionMessage="Module Outline Rejected by User"}`;
        client.emit('initialize-user-message', userMessageId, actionNotificationDirective, MessageType.Action, workspaceId);
        
        await assistantController.insertChatHistory(
          {
            role: 'user',
            content: actionNotificationDirective,
          },
          userMessageId,
          MessageType.Action,
          workspaceId
        );

        // End assistant message sequence
        client.emit('end', workspaceId);
      }
    })
  }    
    
  async insertModuleNode(moduleId: string, nodes: ModuleNodeOutline, ancestor: string) {
    await moduleController.insertChildToModuleNodeCallback(ancestor, moduleId, nodes.id!, '', nodes.title);
    if (!nodes.children || nodes.children?.length === 0) return;

    await Promise.all(
      nodes.children.map(async (childNode: ModuleNodeOutline) => {
        await this.insertModuleNode(moduleId, childNode, nodes.id!);
      })
    );
  }

  async onNewMessage(client: Client, message: string | Message, workspaceId: string, userId: string, chatHistory: Message[]): Promise<void> {
    if (typeof message === 'object') {
      chatHistory.push(message);
    } else {
      chatHistory.push({
        role: 'user',
        content: message,
      });

      
      const userTokens = await calculateTokens4o_mini(message);

      const userMessageId = uuid();
      client.emit('initialize-user-message', userMessageId, message, MessageType.Standard, workspaceId);

      assistantController.insertChatHistory(
        {
          role: 'user',
          content: message,
        },
        userMessageId,
        MessageType.Standard,
        workspaceId
      );

      const intentDecompositionCompletion = await intentDecomposition(this.openai, message);

      switch(intentDecompositionCompletion.parsed?.intent_type) {
        case IntentTypeEnum.Values.query:
          console.log("query pipeline");
          let context;
          try {
            context = await getContext(intentDecompositionCompletion.parsed.subject, workspaceId);
          } catch (error) {
            console.error("Error getting context:", error);
          }
      
          const systemPrompt = 
          `You are an AI agent that's answers the user's query. You will be given relevant context information from a RAG pipeline in regards to the query. If no context information is supplied (i.e. the context information block is empty), inform the user by saying something along the lines of: "The system did not find the relevant information..." but try to answer as accurately as possible. Otherwise if there is relevant context information available, just answer normally based on the available information.

          subject: ${intentDecompositionCompletion.parsed.subject}
          context_instructions: ${intentDecompositionCompletion.parsed.context_instructions}

          CONTEXT INFORMATION BLOCK:
          ---
          ${context}
          ---
          `;
                    
          const systemPromptParam = [{ role: 'system', content: systemPrompt }] as ChatCompletionMessageParam[];

          try {
            await this.processNewMessage(
              systemPromptParam,
              workspaceId, 
              chatHistory, 
              userTokens);
          } catch(error){
            console.error("Error generating query response:", error);
          }
          break;
        case IntentTypeEnum.Values.command:
          console.log("command pipeline");
          
          const commandTypeCompletion = await commandDecomposition(this.openai, intentDecompositionCompletion.parsed?.context_instructions);
          console.log("Command type:", commandTypeCompletion.parsed?.command_type);
          this.commandPipelineProcessing(
            client, 
            commandTypeCompletion.parsed?.command_type,
            intentDecompositionCompletion.parsed.subject,
            intentDecompositionCompletion.parsed.context_instructions,
            workspaceId,
            chatHistory,
            userTokens
          )

          break;
        case IntentTypeEnum.Values.informative:
          console.log("informative pipeline");
          // this.processNewMessage(client, workspaceId, chatHistory, userTokens);
          break;
        case IntentTypeEnum.Values.conversational:
          console.log("conversational pipeline");
          const conversationalSystemPrompt = [{ role: 'system', content: "The user has given a simple greeting/started a conversation. Give a polite response." }] as ChatCompletionMessageParam[];
          try {
            await this.processNewMessage(conversationalSystemPrompt, workspaceId, chatHistory, userTokens);
          } catch(error){
            console.error("Error generating query response:", error);
          }
          break;
        default:
          console.log("misc pipeline");
          const miscSystemPrompt = [{ role: 'system', content: "The user has given a nonsensical/incoherent/out-of-context query as input. Please kindly ask what their intention was politely, or guide them." }] as ChatCompletionMessageParam[];
          try {
            await this.processNewMessage(miscSystemPrompt, workspaceId, chatHistory, userTokens);
          } catch(error){
            console.error("Error generating query response:", error);
          }
          break;
      }
    }
  }

  private async processNewMessage(systemPromptParam: ChatCompletionMessageParam[], workspaceId: string, chatHistory: Message[], userTokens: number): Promise<void> {
    const assistantMessageId = uuid();

    const tupleKey: WorkspaceMessageKey = [assistantMessageId, workspaceId];
    const serializedKey = serializeTuple(tupleKey);

    this.workspaceMessagesBufferProxy.emit(serializedKey, 'initialize-assistant-message', assistantMessageId, MessageType.Standard, workspaceId);

    const stream = this.openai.beta.chat.completions.stream({
      model: "gpt-4o-mini",
      messages: [...systemPromptParam, ...chatHistory],
    });

    const streamHandlers = {
      content: (contentDelta, contentSnapshot) => {
        this.workspaceMessagesBufferProxy.set(serializedKey, [contentDelta, JSON.stringify(contentSnapshot)]);
      },
      finalContent: (contentSnapshot) =>
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalContent', contentSnapshot, workspaceId),
      chunk: (chunk, snapshot) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'chunk', chunk, snapshot, workspaceId),
      chatCompletion: async (completion) => {
        const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
        const usage = {
          prompt_tokens: userTokens,
          completion_tokens: assistantTokens,
          total_tokens: userTokens + assistantTokens,
        };
        const completionWithUsage = {
          ...completion,
          usage: usage
        };
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'chatCompletion', completionWithUsage, workspaceId);
      },
      finalChatCompletion: async (completion) => {
        const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
        const usage = {
          prompt_tokens: userTokens,
          completion_tokens: assistantTokens,
          total_tokens: userTokens + assistantTokens,
        };
        const completionWithUsage = {
          ...completion,
          usage: usage
        };
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalChatCompletion', completionWithUsage, workspaceId);
      },
      message: (message) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'message', message, workspaceId),
      finalMessage: async (message) => {
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalMessage', message, workspaceId);
        assistantController.insertChatHistory(
          message,
          assistantMessageId,
          MessageType.Standard,
          workspaceId
        );
      },
      functionCall: (functionCall) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'functionCall', functionCall, workspaceId),
      finalFunctionCall: (finalFunctionCall) =>
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCall', finalFunctionCall, workspaceId),
      functionCallResult: (finalFunctionCallResult) =>
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
      finalFunctionCallResult: (finalFunctionCallResult, workspaceId) =>
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
      error: (error) => {
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'error', error, workspaceId);
      },
      end: () => {
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'end', workspaceId);
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'debug-log', JSON.stringify({ debug: "Intermediate response ended." }))
      },
    } as ChatCompletionEvents;

    Object.entries(streamHandlers).forEach(([event, handler]) => {
      stream.on(
        event as keyof typeof streamHandlers,
        async (...args: any) => {
          await handler(...args);
        },
      );
    });
  }

  private async intermediateResponse(subject: string, context_instructions: string, piplineStatus: string, workspaceId: string, chatHistory: Message[], userTokens: number): Promise<string> {
    const assistantMessageId = uuid();

    const tupleKey: WorkspaceMessageKey = [assistantMessageId, workspaceId];
    const serializedKey = serializeTuple(tupleKey);

    this.workspaceMessagesBufferProxy.emit(serializedKey, 'initialize-assistant-message', assistantMessageId, MessageType.Standard, workspaceId);

    let finalIntermediateResponse: string = '';

    const systemPrompt = 
    `You are an AI agent that's part of a user input processing pipeline who's main task is to give short, intermediate responses to the user depending on the [subject] and the [context_instructions] if applicable. Give your responses as if you are reassuring the user that their request is being processed.

    pipelineStatus: ${piplineStatus}
    subject: ${subject}
    context_instructions: ${context_instructions}`;

    const systemPromptParam = [{ role: 'system', content: systemPrompt }] as ChatCompletionMessageParam[];

    const stream = this.openai.beta.chat.completions.stream({
      model: "gpt-4o-mini",
      messages: [...systemPromptParam, ...chatHistory],
    });

    const streamHandlers = {
      content: (contentDelta, contentSnapshot) => {
        this.workspaceMessagesBufferProxy.set(serializedKey, [contentDelta, JSON.stringify(contentSnapshot)]);
      },
      finalContent: (contentSnapshot) =>
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalContent', contentSnapshot, workspaceId),
      chunk: (chunk, snapshot) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'chunk', chunk, snapshot, workspaceId),
      chatCompletion: async (completion) => {
        const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
        const usage = {
          prompt_tokens: userTokens,
          completion_tokens: assistantTokens,
          total_tokens: userTokens + assistantTokens,
        };
        const completionWithUsage = {
          ...completion,
          usage: usage
        };
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'chatCompletion', completionWithUsage, workspaceId);
      },
      finalChatCompletion: async (completion) => {
        const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
        const usage = {
          prompt_tokens: userTokens,
          completion_tokens: assistantTokens,
          total_tokens: userTokens + assistantTokens,
        };
        const completionWithUsage = {
          ...completion,
          usage: usage
        };
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalChatCompletion', completionWithUsage, workspaceId);
      },
      message: (message) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'message', message, workspaceId),
      finalMessage: async (message) => {
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalMessage', message, workspaceId);
        finalIntermediateResponse = message.content as string;
        assistantController.insertChatHistory(
          message,
          assistantMessageId,
          MessageType.Standard,
          workspaceId
        );
      },
      functionCall: (functionCall) => this.workspaceMessagesBufferProxy.emit(serializedKey, 'functionCall', functionCall, workspaceId),
      finalFunctionCall: (finalFunctionCall) =>
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCall', finalFunctionCall, workspaceId),
      functionCallResult: (finalFunctionCallResult) =>
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
      finalFunctionCallResult: (finalFunctionCallResult, workspaceId) =>
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
      error: (error) => {
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'error', error, workspaceId);
      },
      end: () => {
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'end', workspaceId);
        this.workspaceMessagesBufferProxy.emit(serializedKey, 'debug-log', JSON.stringify({ debug: "Intermediate response ended." }))
      },
    } as ChatCompletionEvents;

    Object.entries(streamHandlers).forEach(([event, handler]) => {
      stream.on(
        event as keyof typeof streamHandlers,
        async (...args: any) => {
          await handler(...args);
        },
      );
    });

    // Wait until the stream is finished before returning the final response
    return new Promise<string>((resolve, reject) => {
      stream.on('end', () => {
        resolve(finalIntermediateResponse);
      });
      stream.on('error', (error: any) => {
        reject(error);
      });
    });
  }

  private async commandPipelineProcessing(client: Client, commandTypeCompletion: string, subject: string, context_instructions: string, workspaceId: string, chatHistory: Message[], userTokens: number): Promise<void> {
    
    switch(commandTypeCompletion) {
      case commandTypeEnum.Values.create_module:
        const intermediateResponseMessage = await this.intermediateResponse(
          subject,
          context_instructions,
          `The user needs to confirm if the wants to generate the module outline first or directly generate the module and let the system decide the outline directly without confirmation.`,
          workspaceId,
          chatHistory.slice(-1),
          userTokens
        );
        console.log("Intermediate reponse:", intermediateResponseMessage);

        if (intermediateResponseMessage) {
          const assistantMessageId = uuid();
          client.emit('initialize-assistant-message', assistantMessageId, MessageType.Action, workspaceId);

          const moduleOutlineConfirmDirective = `\n\n::module_outline_generation_confirm{subject="${subject}" context_instructions="${context_instructions}"}\n\n`;
          client.emit('content', moduleOutlineConfirmDirective, moduleOutlineConfirmDirective as any, assistantMessageId, workspaceId);
          
          client.emit('end', workspaceId);

          assistantController.insertChatHistory(
            {
              role: 'assistant',
              content: moduleOutlineConfirmDirective,
            },
            assistantMessageId,
            MessageType.Action,
            workspaceId
          );

          // Go to `module-outline-generation` listener for pipeline flow continuation
        }

        break;
      case commandTypeEnum.Values.create_assessment:
        break;
      case commandTypeEnum.Values.reorganize_module:
        break;
      case commandTypeEnum.Values.reorganize_assessment:
        break;
      case commandTypeEnum.Values.rewrite_module_page:
        break;
      case commandTypeEnum.Values.rewrite_module_page_section:
        break;
      default:
        break;
    }
  }

  private async generateModuleNodeContent(moduleId: string, moduleNodeId: string, workspaceId: string, title: string, description: string, subject: string, context_instructions: string) {
    const tupleKey: WorkspaceModuleKey = [moduleId, workspaceId];
    const serializedKey = serializeTuple(tupleKey);

    let finalIntermediateResponse: string = '';

    const systemPrompt = 
    `You are an AI agent that's part of a user input processing pipeline who's main task is to generate content for a module. Focus on creating the actual content of the module node, not the outline, not the overview. Just focus on creating the content. That's all. Make sure it is well structured. Do not output the metadata as it is already displayed in another component.

    Here is the metadata for the module:

    Subject: ${subject}
    Module Title: ${title}
    Description: ${description}

    Consider the following context instructions inferred by the previous processes within the pipeline:

    Context Instructions: ${context_instructions}
    `;

    const systemPromptParam = [{ role: 'system', content: systemPrompt }] as ChatCompletionMessageParam[];

    const stream = this.openai.beta.chat.completions.stream({
      model: "gpt-4o-mini",
      messages: [...systemPromptParam],
    });

    const streamHandlers = {
      content: (contentDelta, contentSnapshot) => {
        const trimmedContentSnapshot = JSON.stringify(contentSnapshot).slice(1, -1);
        this.workspaceModulesBufferProxy.emit(serializedKey, 'update-module-node', moduleId, moduleNodeId, workspaceId, contentDelta, trimmedContentSnapshot);
      },
      finalContent: async (contentSnapshot) => {
        this.workspaceModulesBufferProxy.emit(serializedKey, 'finalContent', contentSnapshot, workspaceId);
        moduleController.updateModuleNodeContentCallback(moduleNodeId, contentSnapshot);
      },
      chunk: (chunk, snapshot) => {
        // console.log("Generated chunk delta: ", chunk.choices[0].delta);
        // console.log("Generated chunk snapshot: ", snapshot.choices[0].message);
        // this.workspaceModulesBufferProxy.emit(serializedKey, 'chunk', chunk, snapshot, workspaceId)
      },
      chatCompletion: async (completion) => {
        console.log("Completion: ", completion.choices[0].message);
        // const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
        // const usage = {
        //   prompt_tokens: userTokens,
        //   completion_tokens: assistantTokens,
        //   total_tokens: userTokens + assistantTokens,
        // };
        // const completionWithUsage = {
        //   ...completion,
        //   usage: usage
        // };
        // client.emit('chatCompletion', completionWithUsage, workspaceId);
      },
      finalChatCompletion: async (completion) => {
        console.log("Final chat completion: ", completion.choices[0].message);
        try {
          const { document } = await chunkAndEmbedFile(
            uuid(),
            completion.choices[0].message.content!,
            '',
          ); 
          console.log("Upserting new pinecone embedding document...");
          documentController.safeUpsertDocument(
            document,
            workspaceId
          )
        } catch (error) {
          console.error("Unable to embed module node: ", error);
        }
        // const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
        // const usage = {
        //   prompt_tokens: userTokens,
        //   completion_tokens: assistantTokens,
        //   total_tokens: userTokens + assistantTokens,
        // };
        // const completionWithUsage = {
        //   ...completion,
        //   usage: usage
        // };
        // client.emit('finalChatCompletion', completionWithUsage, workspaceId);
      },
      message: (message) => this.workspaceModulesBufferProxy.emit(serializedKey, 'message', message, workspaceId),
      finalMessage: async (message) => {
        // this.workspaceModulesBufferProxy.emit(serializedKey, 'finalMessage', message, workspaceId);
        // finalIntermediateResponse = message.content as string;
        // try {
        //   await assistantController.insertChatHistory(
        //     message,
        //     uuid(),
        //     workspaceId
        //   );
        // } catch (error) {
        //   console.error('Error inserting chat history:', error);
        // }
      },
      functionCall: (functionCall) => this.workspaceModulesBufferProxy.emit(serializedKey, 'functionCall', functionCall, workspaceId),
      finalFunctionCall: (finalFunctionCall) =>
        this.workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCall', finalFunctionCall, workspaceId),
      functionCallResult: (finalFunctionCallResult) =>
        this.workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
      finalFunctionCallResult: (finalFunctionCallResult, workspaceId) =>
        this.workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
      error: (error) => {
        this.workspaceModulesBufferProxy.emit(serializedKey, 'error', error, workspaceId);
      },
      end: () => {
        // this.workspaceMessagesBufferProxy.emit(serializedKey, 'end');
      },
    } as ChatCompletionEvents;

    Object.entries(streamHandlers).forEach(([event, handler]) => {
      stream.on(
        event as keyof typeof streamHandlers,
        async (...args: any) => {
          // this.logger(
          //   `Event: ${event}, Args: ${JSON.stringify(args, null, 2)}`,
          // );
          await handler(...args);
        },
      );
    });

    // Wait until the stream is finished before returning the final response
    return new Promise<string>((resolve, reject) => {
      stream.on('end', () => {
        resolve(finalIntermediateResponse);
      });
      stream.on('error', (error: any) => {
        reject(error);
      });
    });
  }

  logger(message: string): void {
    console.debug(`[AISocketHandler] ${message}`);
  }
  
}

export default AISocketHandler;
