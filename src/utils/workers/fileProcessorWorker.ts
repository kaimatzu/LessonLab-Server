import { parentPort, workerData } from "worker_threads";
import { chunkAndEmbedFile, processFile } from "../documentProcessor";

async function processFileWorker() {
  const { documentData, documentType, documentName, documentId, documentUrl, materialId } = workerData;

  try {
    const { confirmation, documentContent } = await processFile(
      documentName,
      documentType,
      documentData,
      documentId,
      materialId
    );

    if (confirmation === "Success") {
      const { document } = await chunkAndEmbedFile(
        documentId,
        documentContent
        // documentUrl,
      ); 
      parentPort?.postMessage({ document, documentData });
    }
    else {
      throw new Error('Failed to process file!');
    }
  } catch (error: any) {
    parentPort?.postMessage({ error: error.message });
  }
}

processFileWorker();
