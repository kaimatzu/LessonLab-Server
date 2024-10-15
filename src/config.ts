import dotenv from "dotenv";
import * as process from "node:process";
dotenv.config();

interface Config {
  pineconeApiKey: string;
  pineconeIndexName: string;
  openAiApiKey: string;
  openAiOrganizationId: string;
}

const config: Config = {
  pineconeApiKey: process.env.PINECONE_API_KEY || "",
  pineconeIndexName:
    process.env.PINECONE_INDEX_NAME || "namespace-notes",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiOrganizationId: process.env.OPENAI_ORGANIZATION_ID || ""
};

export default config;

export const corsOptions = {
  origin: `${process.env.PROTOCOL}://${process.env.ORIGIN}${process.env.ORIGIN === 'localhost' ? ':4000' : ''}`,
  credentials: true, // Allow credentials (cookies, etc.)
};
