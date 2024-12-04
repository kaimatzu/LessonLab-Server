import { Router } from 'express';
import moduleController from '../controllers/moduleController';

const router = Router();

router.post('/create', moduleController.createModule);
router.post('/insert', moduleController.insertChildToModuleNode);
router.patch('/update/module-name/:workspaceId/:moduleId/:name', moduleController.updateModuleName);
router.delete('/delete/:moduleId', moduleController.deleteModule);
router.get('/:moduleId', moduleController.getModules);
router.get('/root/:moduleId', moduleController.getModuleTree);
router.get('/subtree/:moduleId/:moduleNodeId', moduleController.getSubtree);
router.get('/recursive-subtree/:moduleId/:moduleNodeId', moduleController.getSubtreeRecursively);
router.patch('/update/node/content', moduleController.updateModuleNodeContent);
router.patch('/update/node/name', moduleController.updateModuleNodeName);
router.delete('/delete/node/:moduleNodeId', moduleController.deleteModuleNode);
router.patch('/transfer/node', moduleController.transferSubtree);

export default router;