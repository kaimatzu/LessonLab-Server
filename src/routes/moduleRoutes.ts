import { Router } from 'express';
import moduleController from '../controllers/moduleController';

const router = Router();

router.post('/create', moduleController.createModule);
router.post('/insert', moduleController.insertChildToModuleNode);
router.get('/:moduleId', moduleController.getModules);
router.get('/root/:moduleId', moduleController.getModuleTree);
router.get('/subtree/:moduleId/:moduleNodeId', moduleController.getSubtree);
router.get('/recursive-subtree/:moduleId/:moduleNodeId', moduleController.getSubtreeRecursively);
router.patch('/update/node/content', moduleController.updateModuleNodeContent);
router.patch('/update/node/title', moduleController.updateModuleNodeTitle);
router.delete('/delete/node', moduleController.deleteModuleNode);

export default router;