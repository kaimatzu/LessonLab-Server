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

enum MessageType {
  Standard = "standard",
  Action = "action"
}

export interface Options {
  verbose: boolean;
  client?: OpenAIClientOptions;
  chat: Omit<ChatCompletionStreamParams, 'messages' | 'stream'>;
  initMessages: Message[];
}

export interface EventsMap {
  // Socket.io handling
  'request-ack'(userId: string, callback: (ack: string) => void): void
  'join-room'(roomId: string): void; 
  'leave-room'(roomId: string): void;
  'leave-all-rooms'(): void;
  'send-data'(roomId: string): void;
  // Chat events handling
  'new-message'(message: string | Message, userId: string, workspaceId: string, chatHistory: Message[]): void;
  'initialize-user-message'(id: string, content: string, type: MessageType, workspaceId: string): void;
  'initialize-assistant-message'(id: string, type: MessageType, workspaceId: string): void;
  'set-options'(options: Omit<ClientOptions, 'currentChatStream'>): void;
  'debug-log'(message: string): void;
  abort: () => void;
  // Pipeline events handling
  'directive-ready'(...args: [assistantMessageId: string, workspaceId: string, ...any[]]): any; // In case we want to supply more data into the directive callbacks
  'module-outline-generation'(confirmation: boolean, workspaceId: string, subject: string, context_instructions: string): void;
  'module-outline-inject-content'(workspaceId: string, assistantMessageId: string, moduleId: string, subject: string, context_instructions: string);
  'module-outline-data'(assistantMessageId: string, workspaceId: string, moduleId: string, moduleData: ModuleOutline);
  'confirm-module-outline-response'(action: string, workspaceID: string, moduleId: string, module: Module, subject: string, context_instructions: string);
  //Module Specific
  'create-module'(moduleId: string, workspaceID: string, name: string, description: string, callback: (ack: string) => void);
  'update-module-node'(moduleId: string, moduleNodeId: string, workspaceId: string, contentDelta: string, contentSnapshot: string);
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionEvents {
  content: (contentDelta: string, snapshot: ChatCompletionSnapshot | null, assistantMessageId: string, workspaceId: string) => void;
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
  // totalUsage: (usage: CompletionUsage, workspaceId: string) => void;
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

export type MapToString<T extends any[]> = { [K in keyof T]: string };

export type WorkspaceMessageKey = MapToString<[string, string]>; // [assistantMessageId, workspaceId]
export type WorkspaceMessageValue = MapToString<[string, string]>; // [contentDelta, contentSnapshot]
  
// Type-safe Map for workspace messages
export type WorkspaceMessagesBuffer = Map<string, WorkspaceMessageValue>;

export interface WorkspaceMessagesProxy extends Map<string, WorkspaceMessageValue> {
  emit(workspaceId: string, event: keyof EmitEvents, ...args: any[]): void;
}

export interface ModuleNode {
  id: string;
  parent: string | null;
  title: string;
  content: string;
  description: string;
  children: ModuleNode[];
}

export interface Module {
  id: string;
  name: string;
  description: string;
  nodes: ModuleNode[]; 
};

// export type TupleToModuleValue<T extends [string, Module]> = {
//   [K in keyof T]: K extends "0" ? string : Module;
// };

export type WorkspaceModuleKey = MapToString<[string, string]>; // [moduleId, workspaceId]
// export type WorkspaceModuleValue = TupleToModuleValue<[string, Module]>;
  
// Type-safe Map for workspace module
export type WorkspaceModulesBuffer = Map<string, Module>;

export interface WorkspaceModulesProxy extends Map<string, Module> {
  emit(workspaceId: string, event: keyof EmitEvents, ...args: any[]): void;
}
