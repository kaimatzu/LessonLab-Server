import { Server as SocketIO } from 'socket.io';
import http from 'http';
import { app } from './express';
import { corsOptions } from './config';

export const server = http.createServer(app);
export const io = new SocketIO(server, {
  cors: corsOptions
});

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

  socket.on('room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_data', (roomId) => {
    console.log("Submitting payment status data to:", roomId);
    io.in(roomId).emit("message", roomId);
    // socket.leave(roomId);
  })

  socket.on('disconnecting', () => {
    const rooms = Object.keys(socket.rooms);
    rooms.forEach((room) => {
      socket.to(room).emit('user left', { message: 'User has left the room.' });
      socket.leave(room);
      console.log(`Room ${room} is being deleted after user disconnect.`);
    });
  });

  socket.on('disconnect', () => {
    console.log("Rooms disconnect:", socket.rooms);
    const rooms = socket.rooms;
    rooms.forEach((id, room) => {
      socket.to(room).emit('user left', { message: 'User has left the room.' });
      socket.leave(room);
      console.log(id, room)
      console.log(`Room ${room} is being deleted after user disconnect.`);
    });
    console.log('User disconnected');
  });
});