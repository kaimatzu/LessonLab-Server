import express, { Express, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from 'cookie-parser';
import 'reflect-metadata'

import assistantRoutes from "./routes/assistantRoutes";
import documentRoutes from "./routes/documentRoutes";
import contextRoutes from "./routes/contextRoutes";
import userRoutes from "./routes/userRoutes";
import workspaceRoutes from "./routes/workspaceRoutes";
import moduleRoutes from "./routes/moduleRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import exportRoutes from "./routes/exportRoutes";
import { corsOptions } from "./config";

class ExpressApp {

  constructor(public app = express()) {
    app.use(cors(corsOptions));
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.set("trust proxy", 1);

    // Route logger middleware
    const logRoute = (req: Request, res: Response, next: NextFunction) => {
      console.log(`>>> Incoming request to ${req.originalUrl}`)
      next()
    }

    app.use(logRoute);

    app.use("/api/assistant", assistantRoutes);
    app.use("/api/documents", documentRoutes);
    app.use("/api/context", contextRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/workspaces', workspaceRoutes);
    app.use('/api/workspaces/modules', moduleRoutes);
    app.use('/api/transactions', transactionRoutes)
    app.use('/api/exports', exportRoutes)
  }
}

export default ExpressApp;