// server/src/services/workerService.ts
import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface WorkerData {
  documentData?: Buffer;
  documentType?: string;
  documentName?: string;
  documentId?: string;
  documentUrl?: string;
  materialId?: string;
}

class WorkerService {
  private workers: Map<string, Worker> = new Map();
  private workerData: Map<string, WorkerData> = new Map();
  private fileKeys: Map<string, string> = new Map();

  createWorker(userId: string) {
    console.log("Created worker for user: ", userId);
    const workerPath = path.join(__dirname, "../workers/fileProcessorWorker");
    const worker = new Worker(workerPath, {
      workerData: this.workerData.get(userId) || {},
    });

    worker.on("error", (error: Error) => {
      console.error("Worker error:", error);
      this.destructor(userId);
    });

    worker.on("exit", (code: number) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
      this.destructor(userId);
    });

    this.workers.set(userId, worker);
  }

  setMaterialId(userId: string, materialId: string) {
    const data = this.workerData.get(userId) || {};
    data.materialId = materialId;
    this.workerData.set(userId, data);

    const worker = this.workers.get(userId);
    if (worker) {
      worker.postMessage({ materialId });
    }
  }

  setDocumentData(userId: string, file: Express.Multer.File, namespaceId: string) {
    const documentId = uuidv4();
    const fileKey = `${namespaceId}/${documentId}/${file.originalname}`;
    
    const documentUrl = this.constructFileUrl(fileKey);

    const data: WorkerData = {
      documentData: fs.readFileSync(file.path),
      documentType: file.mimetype,
      documentName: file.originalname,
      documentId,
      documentUrl,
      materialId: namespaceId,
    };

    this.workerData.set(userId, data);
    this.fileKeys.set(userId, fileKey);

    const worker = this.workers.get(userId);
    if (worker) {
      worker.postMessage(data);
    }
  }

  getFileKey(userId: string): string | undefined {
    return this.fileKeys.get(userId);
  }

  getWorker(userId: string): Worker | undefined {
    return this.workers.get(userId);
  }

  destructor(userId: string) {
    const worker = this.workers.get(userId);
    if (worker) {
      worker.terminate();
      this.workers.delete(userId);
    }
    this.workerData.delete(userId);
    this.fileKeys.delete(userId);
  }

  private constructFileUrl(fileKey: string): string {
    // Construct the URL for the file based on your storage solution
    return `https://storage.example.com/${fileKey}`;
  }
}

export default new WorkerService();

