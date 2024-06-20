import { Router } from 'express';
import contextController from '../controllers/contextController';

const router = Router();

router.post('/fetch', contextController.fetchContext);
router.post('/fetchquiz', contextController.fetchQuizContext);

export default router;
