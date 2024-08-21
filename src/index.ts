// server/node/src/index.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import 'reflect-metadata'

import http from 'http';
import ExpressApp from "./expressApp";
import SocketServer from "./socketServer";

dotenv.config();

class Server {
  public server: http.Server;
  public expressApp: ExpressApp;
  public socketServer: SocketServer;

  constructor() {
    // Create the HTTP server
    this.server = http.createServer();

    // Initialize the Express application and attach it to the server
    this.expressApp = new ExpressApp();
    this.server.on('request', this.expressApp.app);
    
    // Initialize the SocketServer with the HTTP server
    this.socketServer = new SocketServer(this.server);
    
    this.initialize();
  }

  initialize() {
    var memwatch = require("@airbnb/node-memwatch");
    const uploadsDir = path.join(__dirname, "..", "uploads");
    const exportsDir = path.join(__dirname, "..", "exports");

    if (process.env.NODE_ENV === "production") {
      console.log("Running in production mode");
      console.log = function () { };
    } else if (process.env.NODE_ENV === "profile") {
      memwatch.on("stats", function (stats: any) {
        console.log(stats);
      });
    }

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }

    this.setupWebHookRoutes();

    const PORT = process.env.PORT || 4001;
    this.server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }

  setupWebHookRoutes() {
    this.expressApp.app.post('/api/webhooks/paymongo', (req, res) => {
      console.log('Received webhook:', req.body);
      const paymentStatus = req.body.data.attributes.type;
      const paymentIntentId = req.body.data.attributes.data.attributes.payment_intent_id;
      this.socketServer.io.in(paymentIntentId).emit("payment_message", {
        payment_status: paymentStatus,
        payment_intent_id: paymentIntentId
      });
      res.status(200).send('Webhook received');
    });
  }
}

// Export single instance of server. This is the main entry point of the server. 
// DO NOT RE-INITIALIZE!!!
export const server = new Server();