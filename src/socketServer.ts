import { Server as SocketIO } from 'socket.io';
import http, { Server } from 'http';
import { corsOptions } from "./config";

class SocketServer {

  constructor(
    public server: Server,
    public io = new SocketIO(server, {
      cors: corsOptions
    })
     
  ) {
    io.of("/").adapter.on("create-room", (room) => {
      console.log(`room ${room} was created`);
    });

    io.of("/").adapter.on("join-room", (room, id) => {
      console.log(`socket ${id} has joined room ${room}`);
    });

    io.of("/").adapter.on("leave-room", (room, id) => {
      console.log(`socket ${id} has left room ${room}`);
    });

    io.of("/").adapter.on("delete-room", (room) => {
      console.log(`room ${room} was deleted`);
    });

    io.on('connection', (socket) => {
      console.log('A user connected');

      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
      });

      socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left room ${roomId}`);
      });

      socket.on('leave-all-rooms', () => {
        console.log(`Socket ${socket.id} leaving all rooms`);

        console.log("Rooms:", socket.rooms);
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            console.log(`Leaving ${room}.`);
            socket.leave(room);
          }
        });
      });

      socket.on('send_data', (roomId) => {
        console.log("Submitting payment status data to:", roomId);
        io.in(roomId).emit("message", roomId);
        // socket.leave(roomId);
      })

      socket.on('disconnecting', () => {
        // const rooms = Object.keys(socket.rooms);
        // rooms.forEach((room) => {
        //   socket.leave(room);
        //   console.log(`Room ${room} is being deleted after user disconnect.`);
        // });
      });

      socket.on('disconnect', () => {
        console.log("Rooms disconnect:", socket.rooms);
        socket.rooms.forEach((room) => {
          console.log(`Room ${room} is being deleted after user disconnect.`);
          socket.leave(room);
        });
        console.log('User disconnected');
      });
    });
  }
}

export default SocketServer;