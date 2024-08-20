// server/node/src/index.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import 'reflect-metadata'

import { app } from "./express";
import { io, server } from "./socketServer";

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

const PORT = process.env.PORT || 4001;

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

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
