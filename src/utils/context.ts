import { ScoredPineconeRecord } from "@pinecone-database/pinecone";
import { Metadata, getMatchesFromEmbeddings } from "./pinecone";
import { embedChunks } from "./embeddings";
import { Result } from '../types/result';

/**
 * The function `getContext` retrieves the context of a given message.
 * @param message - The message to analyze.
 * @param namespace - The namespace for the context.
 * @param maxCharacters - The maximum characters to return.
 * @param minScore - The minimum score for qualifying results.
 * @param getOnlyText - If true, return only text.
 * @returns A promise that resolves to a Result containing the context information or an error.
 */
export const getContext = async (
    message: string,
    namespace: string,
    maxCharacters = 5000,
    minScore = 0.15,
    getOnlyText = true
): Promise<Result<string | ScoredPineconeRecord[]>> => {
  return new Promise<Result<string | ScoredPineconeRecord[]>>(async (resolve, reject) => {
    try {
      console.log("Subject: ", message);
      console.log("Workspace: ", namespace);

      // Wrap the message in an array before passing it to embedChunks
      const embeddingsResult = await embedChunks([message]);

      if (embeddingsResult.isError()) {
        return reject(Result.err(new Error("Failed to embed chunks."))); // Handle embedding errors
      }

      // Extract the embedding from the response
      const embedding = embeddingsResult.unwrap()[0].embedding;

      const matchesResult = await getMatchesFromEmbeddings(embedding, 15, namespace);

      if (matchesResult.isError()) {
        return reject(Result.err(new Error("Failed to get matches from embeddings."))); // Handle match fetching errors
      }

      const matches = matchesResult.unwrap();
      console.log("Matches:", matches.length);
      const qualifyingDocs = matches.filter((m) => m.score && m.score > minScore);
      console.log("Qualifying docs:", qualifyingDocs.length);

      if (!getOnlyText) {
        return resolve(Result.ok(qualifyingDocs)); // Return qualifying documents if requested
      }

      // Deduplicate and get text
      const documentTexts = qualifyingDocs.map((match) => {
        const metadata = match.metadata as Metadata;
        return `REFERENCE URL: ${metadata.referenceURL} CONTENT: ${metadata.text}`;
      });

      // Concatenate, then truncate by maxCharacters
      const concatenatedDocs = documentTexts.join(" ");
      return resolve(Result.ok(concatenatedDocs.length > maxCharacters
          ? concatenatedDocs.substring(0, maxCharacters)
          : concatenatedDocs));
    } catch (error) {
      return reject(Result.err(new Error(`Failed to get context: ${error}`)));
    }
  });
};