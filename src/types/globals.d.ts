import { Socket } from 'socket.io';
import { ClientOptions as OpenAIClientOptions } from 'openai';
import {
  ChatCompletionSnapshot,
  ChatCompletionStream,
  ChatCompletionStreamParams,
} from 'openai/lib/ChatCompletionStream';
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  CompletionUsage,
} from 'openai/resources';
import { OpenAIError } from 'openai/error';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

export type Message = ChatCompletionMessageParam;

export interface Options {
  verbose: boolean;
  client?: OpenAIClientOptions;
  chat: Omit<ChatCompletionStreamParams, 'messages' | 'stream'>;
  initMessages: Message[];
}


export interface EventsMap {
  'join-room'(roomId: string): void; 
  'leave-room'(roomId: string): void;
  'leave-all-rooms'(): void;
  'send-data'(roomId: string): void;
  'new-message'(message: string | Message, workspaceId: string, chatHistory: Message[]): void;
  'retrieve-user-message'(id: string, content: string, workspaceId: string): void;
  'retrieve-assistant-message'(id: string, workspaceId): void;
  'set-options'(options: Omit<ClientOptions, 'currentChatStream'>): void;
  'debug-log'(message: string): void;
  abort: () => void;
}

export interface ChatCompletionEvents {
  content: (contentDelta: string, contentSnapshot: string, assistantMessageId: string, workspaceId: string) => void;
  chunk: (chunk: ChatCompletionChunk, snapshot: ChatCompletionSnapshot, workspaceId: string) => void;
  functionCall: (functionCall: ChatCompletionMessage.FunctionCall, workspaceId: string) => void;
  message: (message: Message, workspaceId: string) => void;
  chatCompletion: (completion: ChatCompletion, workspaceId: string) => void;
  finalContent: (contentSnapshot: string, workspaceId: string) => void;
  finalMessage: (message: Message, workspaceId: string) => void;
  finalChatCompletion: (completion: ChatCompletion, workspaceId: string) => void;
  finalFunctionCall: (functionCall: ChatCompletionMessage.FunctionCall, workspaceId: string) => void;
  functionCallResult: (content: string, workspaceId: string) => void;
  finalFunctionCallResult: (content: string, workspaceId: string) => void;
  error: (error: OpenAIError, workspaceId: string) => void;
  end: (workspaceId: string) => void;
  totalUsage: (usage: CompletionUsage, workspaceId: string) => void;
}

export interface ListenEvents extends EventsMap {}

export interface EmitEvents extends EventsMap, ChatCompletionEvents {}

export type ClientOptions = {
  chat: Options['chat'];
  initMessages: Options['initMessages'];
  currentChatStream?: ChatCompletionStream;
};

export interface Client
  extends Socket<ListenEvents, EmitEvents, DefaultEventsMap, ClientOptions> {}
  // extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {}