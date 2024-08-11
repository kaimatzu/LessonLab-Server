
import { Router } from 'express';
import ExportController from '../controllers/exportController';

const router = Router();

router.post('', ExportController.createExport)
router.delete('', ExportController.deleteExport)

export default router