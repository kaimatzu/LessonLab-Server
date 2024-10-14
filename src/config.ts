import dotenv from "dotenv";
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
  origin: process.env.ORIGIN, // Specify the client origin (TODO: change later in deployment)
  credentials: true, // Allow credentials (cookies, etc.)
};
