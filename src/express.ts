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
import workspaceRoutes from "./routes/workspaceRoutes";
import moduleRoutes from "./routes/moduleRoutes";
import classRoutes from "./routes/classRoutes";
import enrollmentRoutes from "./routes/enrollmentRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import exportRoutes from "./routes/exportRoutes";
import { corsOptions } from "./config";

export const app = express();

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());

app.use("/api/documents", documentRoutes);
app.use("/api/context", contextRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/modules', moduleRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/enrollments', enrollmentRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/exports', exportRoutes)