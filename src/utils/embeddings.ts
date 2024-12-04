//embeddings.ts

import OpenAI from "openai";
import config from "../config";
import { Result } from '../types/result';
import {Embedding} from "openai/resources";

/**
 * Embed a piece of text using an embedding model or service.
 * This is a placeholder and needs to be implemented based on your embedding solution.
 *
 * @param chunks The text to embed.
 * @returns The embedded representation of the text.
 */
export async function embedChunks(chunks: string[]): Promise<Result<Embedding[]>> {
  const openai = new OpenAI({
    apiKey: config.openAiApiKey,
    organization: config.openAiOrganizationId,
  });

  return new Promise<Result<Embedding[]>>(async (resolve, reject) => {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunks,
        encoding_format: "float",
        dimensions: 1536,
      });

      resolve(Result.ok(response.data)); // Wrap the successful response in Result.ok
    } catch (error) {
      reject(Result.err(new Error(`Error embedding text: ${error}`))); // Wrap the error in Result.err
    }
  });
}