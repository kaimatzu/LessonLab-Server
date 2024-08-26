import { Router } from 'express';
import assistantController from '../controllers/assistantController';

const router = Router();

router.get('/:workspaceId', assistantController.getChatHistory);

export default router;