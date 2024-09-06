import { Router } from 'express';
import assistantController from '../controllers/assistantController';

const router = Router();

router.get('/:workspaceId', assistantController.getChatHistory);
router.patch('/update', assistantController.updateChatMessage);
export default router;