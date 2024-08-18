import { Router } from 'express';
import moduleController from '../controllers/moduleController';

const router = Router();

router.post('/create', moduleController.createModule);
router.post('/insert', moduleController.insertChildToModuleNode);
router.get('/:moduleId/:moduleNodeId', moduleController.getSubtree);
router.get('/recursive/:moduleId/:moduleNodeId', moduleController.getSubtreeRecursively);
export default router;