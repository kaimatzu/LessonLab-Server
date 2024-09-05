import { Server as SocketIO } from 'socket.io';
import { Server } from 'http';
import { corsOptions } from "./config";
import express from "express";

import {
  Client,
  EmitEvents,
  Message,
  Module,
  ModuleNode,
  WorkspaceMessageKey,
  WorkspaceMessagesBuffer,
  WorkspaceMessagesProxy,
  WorkspaceMessageValue,
  WorkspaceModulesBuffer,
  WorkspaceModulesProxy,
} from './types/globals';
import AISocketHandler from './ai';



export function serializeTuple(ids: [string, string]): string {
  return `${ids[0]}|${ids[1]}`;
}

export function deserializeTuple(serializedKey: string): [string, string] {
  const parts = serializedKey.split('|');
  if (parts.length !== 2) {
    throw new Error('Invalid serialized tuple format');
  }
  return [parts[0], parts[1]];
}

class SocketServer {
  /**
   * Socket server clients.
   */
  public clients: Map<string, Client> = new Map<string, Client>();

  /**
   * SocketIO object.
   */
  public io: SocketIO;

  /**
   * Buffer for storing messages in case user disconnects or connection errors happen.
   */
  public workspaceMessagesBuffer: WorkspaceMessagesBuffer = new Map<string, WorkspaceMessageValue>();

  /**
   * Buffer for storing modules in case user disconnects or connection errors happen.
   */
  public workspaceModulesBuffer: WorkspaceModulesBuffer = new Map<string, Module>();

  /**
   * Proxy handler for emitting SocketIO events (message buffer events).
   */
  public socketEmitMessageBufferHandler = (io: SocketIO) => ({
    get(target: WorkspaceMessagesBuffer, prop: string) {
      if (prop === 'emit') {
        return (serializedKey: string, event: keyof EmitEvents, ...args: any[]) => {
          const [assistantMessageId, workspaceId] = deserializeTuple(serializedKey);

          const socket = io.in(workspaceId); // Get the socket room by workspaceId
          if (socket) {
            socket.emit(event, ...args); // Emit the event with all provided arguments
          }
          if (event === 'end') {
            target.delete(workspaceId); // Delete the entry from the map on 'end' event
          }
        };
      }

      // Override default callback for `set`.
      const callback = Reflect.get(target, prop);
      if (prop === 'set' && typeof callback === 'function') {
        return (serializedKey: string, content: WorkspaceMessageValue) => {
          const [assistantMessageId, workspaceId] = deserializeTuple(serializedKey);
          
          const result = callback.call(target, serializedKey, content);

          const socket = io.in(workspaceId); 
          if (socket) {
            socket.emit('content', content[0], content[1], assistantMessageId, workspaceId);
          }

          return result;
        };
      }

      // Handle other methods or properties
      return typeof callback === 'function' ? callback.bind(target) : callback; 
    }
  });

  /**
   * Proxy handler for emitting SocketIO events (module buffer events).
   */
  public socketEmitModuleBufferHandler = (io: SocketIO) => ({
    get(target: WorkspaceModulesBuffer, prop: string) {
      if (prop === 'emit') {
        return (serializedKey: string, event: keyof EmitEvents, ...args: any[]) => {
          const [moduleId, workspaceId] = deserializeTuple(serializedKey);

          // console.log("Key values in buffer handler", moduleId, workspaceId)

          const socket = io.in(workspaceId); // Get the socket room by workspaceId
          if (socket) {
            socket.emit(event, ...args); // Emit the event with all provided arguments
          }
          if (event === 'update-module-node') {
            const [moduleId, moduleNodeId, workspaceId, contentDelta, contentSnapshot] = args as [
              moduleId: string, 
              moduleNodeId: string, 
              workspaceId: string, 
              contentDelta: string, 
              contentSnapshot: string
            ];
          
            // console.log("Serialized key in update buffer callback", serializedKey);
          
            // Retrieve the module using Reflect.get(target, 'get')
            const getCallback = this.get(target, 'get');
            const module: Module = getCallback(serializedKey);
          
            if (!module) {
              console.log("Serialized key:", serializedKey);
              console.error(`Module with id ${moduleId} not found in buffer.`);
              return;
            }
          
            // console.log("Module node id inside callback:", moduleNodeId);
            // console.log("Module get inside callback:", JSON.stringify(module, null, 2));
          
            // Recursive function to find the node by id
            const findNodeById = (nodes: ModuleNode[], nodeId: string): ModuleNode | null => {
              for (const node of nodes) {
                if (node.id === nodeId) {
                  return node;
                }
                if (node.children && node.children.length > 0) {
                  const foundNode = findNodeById(node.children, nodeId);
                  if (foundNode) {
                    return foundNode;
                  }
                }
              }
              return null;
            };
          
            // Find the node recursively
            const moduleNode = findNodeById(module.nodes, moduleNodeId);
          
            if (!moduleNode) {
              console.error(`Module node with id ${moduleNodeId} not found in module ${moduleId}.`);
              return;
            }
          
            // console.log("Module node inside callback:", moduleNode);
          
            // Update the content of the found module node
            moduleNode.content = contentSnapshot;
          }
          
          if (event === 'end') {
            console.log("Deleting buffer item", serializedKey);
            const deleteCallback = this.get(target, 'delete');
            deleteCallback(serializedKey);
            // target.delete(workspaceId); // Delete the entry from the map on 'end' event
          }
        };
      }
      
      // Default callbacks (get, set, etc.)
      const callback = Reflect.get(target, prop);
      return typeof callback === 'function' ? callback.bind(target) : callback;
    }
  });

  /**
   * Proxy object for the userMessagesBuffer map.
   */
  public workspaceMessagesBufferProxy: WorkspaceMessagesProxy;

  /**
   * Proxy object for the userMessagesBuffer map.
   */
  public workspaceModulesBufferProxy: WorkspaceModulesProxy;

  constructor(
    public server: Server,
  ) {
    this.io = new SocketIO(server, {
      cors: corsOptions
    });

    this.workspaceMessagesBufferProxy = new Proxy(this.workspaceMessagesBuffer, this.socketEmitMessageBufferHandler(this.io)) as WorkspaceMessagesProxy;
    this.workspaceModulesBufferProxy = new Proxy(this.workspaceModulesBuffer, this.socketEmitModuleBufferHandler(this.io)) as WorkspaceModulesProxy;

    this.io.of("/").adapter.on("create-room", (room: any) => {
      console.log(`room ${room} was created`);
    });

    this.io.of("/").adapter.on("join-room", (room: any, id: any) => {
      console.log(`client ${id} has joined room ${room}`);
    });

    this.io.of("/").adapter.on("leave-room", (room: any, id: any) => {
      console.log(`client ${id} has left room ${room}`);
    });

    this.io.of("/").adapter.on("delete-room", (room: any) => {
      console.log(`room ${room} was deleted`);
    });

    this.io.on('connection', (client: Client) => {
      const { id } = client;
      const data = client.handshake.query['userId'];
      
      console.log("Query data:", data);

      this.logger(`Client connected: ${id}`);

      client.on('request-ack', (userId: string, callback: (ack: string) => void) => {
        if (userId) {
          console.log(`Acknowledging connection for user: ${userId}`);
          callback('success'); // Acknowledge successful connection
        } else {
          callback('error'); // Send an error acknowledgment
        }
      });

      // client.join(data as string);
      
      this.clients.set(id, client);
      
      client.on('join-room', (roomId) => client.join(roomId));
      
      client.on('leave-room', (roomId) => client.leave(roomId));
      
      client.on('leave-all-rooms', () => {
        client.rooms.forEach((room) => {
          if (room !== client.id) {
            console.log(`Leaving ${room}.`);
            client.leave(room);
          }
        });
      });
      
      client.on('send-data', (roomId) => {this.io.in(roomId).emit("message", roomId)})
      
      client.on('disconnecting', () => {});
      
      client.on('disconnect', () => {
        const { id } = client;
        this.clients.delete(id);
        console.log("Rooms disconnect:", client.rooms);
        client.rooms.forEach((room) => {
          console.log(`Room ${room} is being deleted after user disconnect.`);
          client.leave(room);
        });
        this.logger(`Client disconnected: ${id}`);
      });
      
      new AISocketHandler(client, {
        verbose: false,
        chat: { model: 'gpt-4o-mini' },
        initMessages: [
          { role: 'system', content: 'You are a helpful assistant.' },
        ],
      },
      // this.clients,
      this.workspaceMessagesBufferProxy,
      this.workspaceModulesBufferProxy,
      );
    });
  }

  // onDisconnect(socket: Client): void {
  //   const { id } = socket;
  //   this.clients.delete(id);
  //   console.log("Rooms disconnect:", socket.rooms);
  //   socket.rooms.forEach((room) => {
  //     console.log(`Room ${room} is being deleted after user disconnect.`);
  //     socket.leave(room);
  //   });
  //   this.logger(`Client disconnected: ${id}`);
  // }

  // leaveAllRooms(socket: Client): void {
  //   socket.rooms.forEach((room) => {
  //     if (room !== socket.id) {
  //       console.log(`Leaving ${room}.`);
  //       socket.leave(room);
  //     }
  //   });
  // }

  /**
   *  Logs a message if the verbose option is set to true.
   * @param {string} message
   * @returns {void}
   */
    logger(message: string): void {
      console.debug(`[Socket] ${message}`);
    }
}

export default SocketServer;