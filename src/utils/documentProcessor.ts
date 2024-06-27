// documentProcessor.ts

import { Document } from "../models/documentModel";
import pdfParse from "pdf-parse";
import { embedChunks } from "./embeddings";
import { getDbConnection } from "./storage/database";

async function processFile(
  /**
   * Processes a file and extracts its content and word count.
   * @param documentName - The name of the file.
   * @param documentType - The type of the file.
   * @param documentData - The file data as a Buffer.
   * @param documentId - The ID of the document.
   * @param materialId - The ID of the material (workspace)
   * @returns An object containing the document content, word count, and an optional error message.
   */
  documentName: string,
  documentType: string,
  documentData: Buffer,
  documentId: string,
  materialId: string, 
): Promise<{ confirmation: string; documentContent: string, wordCount: number; error?: string }> {
  console.log("Process file")
  try {
    let documentContent = "";
    if (documentType === "application/pdf") {
      const pdfData = await pdfParse(documentData, {
        pagerender: function (page: any) {
          return page
            .getTextContent({
              normalizeWhitespace: true,
            })
            .then(function (textContent: { items: any[] }) {
              return textContent.items
                .map(function (item) {
                  return item.str;
                })
                .join(" ");
            });
        },
      });
      documentContent = pdfData.text;
      console.log("Processing file ", documentName);
    } else {
      documentContent = documentData.toString("utf8");
    }

    const wordCount = documentContent.split(/\s+/).length;

    // const connection = await getDbConnection();
    // await connection.execute("INSERT INTO `Documents` (`DocumentData`, `DocumentType`, `DocumentName`, `DocumentID`, `MaterialID`) VALUES (?, ?, ?, ?, ?)", [documentContent, documentType, documentName, documentId, materialId]);
    // await connection.end();
    
    return { confirmation: "Success", documentContent, wordCount };
  } catch (error: any) {
    console.error(
      "An error occurred while processing the document:",
      error.message
    );
    throw error;
  }
}

/**
 * Chunks the content into smaller pieces and embeds them using the embedChunks function.
 * @param documentId - The ID of the document.
 * @param documentContent - The content of the document to chunk and embed.
 * @returns A promise that resolves to an object containing the processed document.
 * @throws If there is an error in chunking and embedding the document.
 */
async function chunkAndEmbedFile(
  documentId: string, documentContent: string,
): Promise<{ document: Document }> {
  try {  
    // Convert LONGBLOB document data to string.
    const content = documentContent;

    // console.log("File content: ", content);

    const document: Document = {
      documentId,
      chunks: [],
    };
    
    // console.log("content -> ", content);
    // Pick a chunking strategy (this will depend on the use case and the desired chunk size!)
    const chunks = chunkTextByMultiParagraphs(content);

    // Embed the chunks using the embedChunks function
    const embeddings = await embedChunks(chunks);

    // Combine the chunks and their corresponding embeddings
    // Construct the id prefix using the documentId and the chunk index
    for (let i = 0; i < chunks.length; i++) {
      document.chunks.push({
        id: `${document.documentId}:${i}`,
        values: embeddings[i].embedding,
        text: chunks[i],
      });
    }
    console.log("->")

    return { document };
  } catch (error) {
    console.error("Error in chunking and embedding document:", error);
    throw error;
  }
}
/**
 * Splits a given text into chunks of 1 to many paragraphs.
 *
 * @param text - The input text to be chunked.
 * @param maxChunkSize - The maximum size (in characters) allowed for each chunk. Default is 1000.
 * @param minChunkSize - The minimum size (in characters) required for each chunk. Default is 100.
 * @returns An array of chunked text, where each chunk contains 1 or multiple "paragraphs"
 */
function chunkTextByMultiParagraphs(
  text: string,
  maxChunkSize = 1500,
  minChunkSize = 500
): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + maxChunkSize;
    if (endIndex >= text.length) {
      endIndex = text.length;
    } else {
      // Just using this to find the nearest paragraph boundary
      const paragraphBoundary = text.indexOf("\n\n", endIndex);
      if (paragraphBoundary !== -1) {
        endIndex = paragraphBoundary;
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length >= minChunkSize) {
      chunks.push(chunk);
      currentChunk = "";
    } else {
      currentChunk += chunk + "\n\n";
    }

    startIndex = endIndex + 1;
  }

  if (currentChunk.length >= minChunkSize) {
    chunks.push(currentChunk.trim());
  } else if (chunks.length > 0) {
    chunks[chunks.length - 1] += "\n\n" + currentChunk.trim();
  } else {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export { chunkAndEmbedFile, processFile };
