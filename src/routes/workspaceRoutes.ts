import { Router } from 'express';
import workspaceController from '../controllers/workspaceController';

const router = Router();

router.post('/create', workspaceController.createWorkspace)
router.get('/:workspaceId', workspaceController.getWorkspace)
router.get('', workspaceController.getWorkspaces)
router.patch('/:workspaceId/:workspaceName', workspaceController.updateWorkspace)
router.delete('/:workspaceId', workspaceController.deleteWorkspace)

// TODO: Refactor this into new file
router.get('/specifications/:workspaceId', workspaceController.getSpecifications)
router.post('/specifications', workspaceController.insertSpecification);
router.delete('/specifications/:WorkspaceID/:SpecificationID', workspaceController.deleteSpecification);
router.patch('/specifications/update/name', workspaceController.updateSpecificationName)
router.patch('/specifications/update/topic', workspaceController.updateSpecificationTopic)
router.patch('/specifications/update/comprehensionlevel', workspaceController.updateSpecificationComprehensionLevel)
router.patch('/specifications/update/writinglevel', workspaceController.updateSpecificationWritingLevel)
router.get('/specifications/additionalspecifications/:SpecificationID', workspaceController.getAdditionalSpecifications)
router.post('/specifications/additionalspecifications', workspaceController.insertAdditionalSpecification)
router.patch('/specifications/additionalspecifications', workspaceController.updateAdditionalSpecification)
router.delete('/specifications/additionalspecifications/:AdditionalSpecID', workspaceController.removeAdditionalSpecification)

export default router;