import { Server as SocketIO } from 'socket.io';
import { Server } from 'http';
import { corsOptions } from "./config";

import {
  Client,
  Message,
} from './types/globals';
import AISocketHandler from './ai';

class SocketServer {
  /**
   * Socket clients
   */
  public clients: Map<string, Client> = new Map<string, Client>();

  public io: SocketIO;

  constructor(
    public server: Server,
  ) {
    this.io = new SocketIO(server, {
      cors: corsOptions
    });

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
      this.logger(`Client connected: ${id}`);
      
      this.clients.set(id, client);
      
      client.on('join-room', (roomId) => client.join(roomId));
      
      client.on('leave-room', (roomId) => client.leave(roomId));
      
      client.on('leave-all-rooms', () => this.leaveAllRooms(client));
      
      client.on('send-data', (roomId) => {this.io.in(roomId).emit("message", roomId)})
      
      client.on('disconnecting', () => {});
      
      client.on('disconnect', () => this.onDisconnect(client));
      
      new AISocketHandler(client, {
        verbose: false,
        chat: { model: 'gpt-3.5-turbo' },
        initMessages: [
          { role: 'system', content: 'You are a helpful assistant.' },
        ],
      },
      this.clients,
      );
    });
  }

  onDisconnect(socket: Client): void {
    const { id } = socket;
    this.clients.delete(id);
    console.log("Rooms disconnect:", socket.rooms);
    socket.rooms.forEach((room) => {
      console.log(`Room ${room} is being deleted after user disconnect.`);
      socket.leave(room);
    });
    this.logger(`Client disconnected: ${id}`);
  }

  leaveAllRooms(socket: Client): void {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        console.log(`Leaving ${room}.`);
        socket.leave(room);
      }
    });
  }

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