// pinecone.ts

import {
  Pinecone,
  type ScoredPineconeRecord,
} from "@pinecone-database/pinecone";

import { Result } from '../types/result';

export type Metadata = {
  referenceURL: string;
  text: string;
};

// Used to retrieve matches for the given embeddings
const getMatchesFromEmbeddings = async (
    embeddings: number[],
    topK: number,
    namespace: string
): Promise<Result<ScoredPineconeRecord<Metadata>[]>> => {
  const pinecone = new Pinecone();

  let indexName: string = process.env.PINECONE_INDEX_NAME || "";
  if (indexName === "") {
    indexName = "lessonlab";
    console.warn("PINECONE_INDEX_NAME environment variable not set");
  }

  // Retrieve list of indexes to check if expected index exists
  const indexes = (await pinecone.listIndexes())?.indexes;
  if (!indexes || indexes.filter((i) => i.name === indexName).length !== 1) {
    return Result.err(new Error(`Index ${indexName} does not exist. Create an index called "${indexName}" in your project.`));
  }

  // Get the Pinecone index and namespace
  const pineconeNamespace = pinecone.Index<Metadata>(indexName).namespace(namespace ?? "");

  return new Promise<Result<ScoredPineconeRecord<Metadata>[]>>(async (resolve, reject) => {
    try {
      // Query the index with the defined request
      const queryResult = await pineconeNamespace.query({
        vector: embeddings,
        topK,
        includeMetadata: true,
      });

      resolve(Result.ok(queryResult.matches || []));
    } catch (error) {
      return reject(Result.err(new Error(`Error querying embeddings: ${error}`)));
    }
  });
};

export { getMatchesFromEmbeddings };
