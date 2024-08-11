// server/node/src/index.ts
import fs from "fs";
import path from "path";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import 'reflect-metadata'

import { Server as SocketIO } from 'socket.io';
import http from 'http';

import documentRoutes from "./routes/documentRoutes";
import contextRoutes from "./routes/contextRoutes";
import userRoutes from "./routes/userRoutes";
import materialRoutes from "./routes/materialRoutes";
import classRoutes from "./routes/classRoutes";
import enrollmentRoutes from "./routes/enrollmentRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import exportRoutes from "./routes/exportRoutes";

var memwatch = require("@airbnb/node-memwatch");

// Define the path for the uploads directory
const uploadsDir = path.join(__dirname, "..", "uploads");
const exportsDir = path.join(__dirname, "..", "exports")

if (process.env.NODE_ENV === "production") {
  console.log("Running in production mode");
  console.log = function () { };
} else if (process.env.NODE_ENV === "profile") {
  memwatch.on("stats", function (stats: any) {
    console.log(stats);
  });
}

// Create the 'uploads' directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Create the 'quizzes' directory if it doesn't exist
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir)
}

dotenv.config();

const corsOptions = {
  origin: 'http://localhost:4000', // Specify the client origin (TODO: change later in deployment)
  credentials: true, // Allow credentials (cookies, etc.)
};

const app = express();

const PORT = process.env.PORT || 4001;

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());

app.use('/exports', express.static(exportsDir))

app.use("/api/documents", documentRoutes);
app.use("/api/context", contextRoutes);
app.use('/api/users', userRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/enrollments', enrollmentRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/exports', exportRoutes)

app.post('/api/webhooks/paymongo', (req, res) => {
  console.log('Received webhook:', req.body);
  console.log('Received webhook:', req.body.data.attributes.data);
  console.log('Received webhook:', req.body.data.attributes.data.attributes.payment_intent_id);
  const paymentStatus = req.body.data.attributes.type;
  const paymentIntentId = req.body.data.attributes.data.attributes.payment_intent_id;
  io.in(paymentIntentId).emit("payment_message", {
    payment_status: paymentStatus,
    payment_intent_id: paymentIntentId
  });
  res.status(200).send('Webhook received');
});

const server = http.createServer(app);
const io = new SocketIO(server, {
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

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
