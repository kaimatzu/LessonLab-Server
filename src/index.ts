// server/node/src/index.ts
import fs from "fs";
import path from "path";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import 'reflect-metadata'
import documentRoutes from "./routes/documentRoutes";
import contextRoutes from "./routes/contextRoutes";
import userRoutes from "./routes/userRoutes";
import materialRoutes from "./routes/materialRoutes";
import classRoutes from "./routes/classRoutes";
import enrollmentRoutes from "./routes/enrollmentRoutes";
var memwatch = require("@airbnb/node-memwatch");

// Define the path for the uploads directory
const uploadsDir = path.join(__dirname, "..", "uploads");

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
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

const corsOptions = {
  origin: 'http://localhost:4000', // Specify the client origin (TODO: change later in deployment)
  credentials: true, // Allow credentials (cookies, etc.)
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());

app.use("/api/documents", documentRoutes);
app.use("/api/context", contextRoutes);
app.use('/api/users', userRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/enrollments', enrollmentRoutes)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
