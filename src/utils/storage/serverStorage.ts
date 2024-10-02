// serverStorage.ts
import fs from "fs";
import path from "path";
import { FileDetail, StorageService } from "./storage";
import { getDbConnection } from "./database";

export class ServerStorage implements StorageService {
  private readonly uploadDir = "uploads";

  async saveFile(file: Express.Multer.File, fileKey: string): Promise<void> {
    const [namespaceId, documentId, ...rest] = fileKey.split("/");
    const fileName = rest.join("/");
    // const documentDirectory = path.join(
    //   this.uploadDir,
    //   namespaceId,
    //   documentId
    // );

    // if (!fs.existsSync(documentDirectory)) {
    //   fs.mkdirSync(documentDirectory, { recursive: true });
    // }

    // const destinationPath = path.join(documentDirectory, fileName);
    // await fs.promises.rename(file.path, destinationPath);
    
    console.log("Save file SQL params: ", [file.buffer, file.mimetype, fileName, documentId, namespaceId]);
    
    const connection = await getDbConnection();
    await connection.execute("INSERT INTO `Documents` (`DocumentData`, `DocumentType`, `DocumentName`, `DocumentID`, `WorkspaceID`) VALUES (?, ?, ?, ?, ?)", [file.buffer, file.mimetype, fileName, documentId, namespaceId]);
    await connection.end();
  }

  constructFileUrl(fileKey: string): string {
    const domain =
      process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4001}`;
    return `${domain}/api/documents/files/${fileKey}`;
  }

  async getFilePath(fileKey: string): Promise<string> {
    const filePath = path.join(this.uploadDir, fileKey);
    const files = await fs.promises.readdir(filePath);
    const firstFile = files[0];
    return path.join(filePath, firstFile);
  }

  async deleteWorkspaceFiles(namespaceId: string): Promise<void> {
    const namespaceDirectory = path.join(this.uploadDir, namespaceId);
    if (fs.existsSync(namespaceDirectory)) {
      fs.rmdirSync(namespaceDirectory, { recursive: true });
    }
  }

  async deleteFileFromWorkspace(
    namespaceId: string,
    documentId: string
  ): Promise<void> {
    try {
      const connection = await getDbConnection();

      // Delete the document from the database
      await connection.execute(
        "DELETE FROM `Documents` WHERE `WorkspaceID` = ? AND `DocumentID` = ?",
        [namespaceId, documentId]
      );

      // Delete the file from the storage (if you still want to handle local deletion)
      const documentDirectory = path.join(this.uploadDir, namespaceId, documentId);
      if (fs.existsSync(documentDirectory)) {
        fs.rmdirSync(documentDirectory, { recursive: true });
      }

      await connection.end();
    } catch (error) {
      console.error("Failed to delete file from server storage:", error);
      throw error;
    }
  }


  async listFilesInNamespace(namespaceId: string): Promise<FileDetail[]> {
    const connection = await getDbConnection();
    try {
      const [rows]: any = await connection.execute(
        "SELECT `DocumentID`, `DocumentName` FROM `Documents` WHERE `WorkspaceID` = ?",
        [namespaceId]
      );
      await connection.end();

      if (rows.length === 0) {
        return []; // Return an empty array if no files are found
      }

      const allFiles: FileDetail[] = rows.map((row: any) => ({
        documentId: row.DocumentID,
        name: row.DocumentName,
        url: this.constructFileUrl(`${namespaceId}/${row.DocumentID}/${row.DocumentName}`),
      }));

      return allFiles;
    } catch (error) {
      console.error(
        "Failed to list files in namespace from server storage:",
        error
      );
      await connection.end();
      throw error;
    }
  }
}
