import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const fileFilter = (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf'];
  const extension = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(extension)) {
    callback(null, true);
  } else {
    callback(new Error('Invalid file type. Only PDF files are allowed.'));
  }
};

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
}).fields([
  { name: 'files', maxCount: 20 },
]);