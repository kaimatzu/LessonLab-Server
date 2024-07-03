import { Router } from 'express';
import materialController from '../controllers/materialController';

const router = Router();

router.post('/create', materialController.createMaterial)
router.get('/:materialId', materialController.getMaterial)
router.get('', materialController.getMaterials)
router.patch('/:materialId', materialController.updateMaterial)
router.delete('/:materialId', materialController.deleteMaterial)

router.get('/specifications/:materialId', materialController.getSpecifications)
router.post('/specifications', materialController.insertSpecification);
router.delete('/specifications/:MaterialID/:SpecificationID', materialController.deleteSpecification);
router.patch('/specifications/update/name', materialController.updateSpecificationName)
router.patch('/specifications/update/topic', materialController.updateSpecificationTopic)
router.patch('/specifications/update/comprehensionlevel', materialController.updateSpecificationComprehensionLevel)
router.patch('/specifications/update/writinglevel', materialController.updateSpecificationWritingLevel)
router.get('/specifications/additionalspecifications/:SpecificationID', materialController.getAdditionalSpecifications)
router.post('/specifications/additionalspecifications', materialController.insertAdditionalSpecification)
router.patch('/specifications/additionalspecifications', materialController.updateAdditionalSpecification)
router.delete('/specifications/additionalspecifications/:AdditionalSpecID', materialController.removeAdditionalSpecification)
// router.delete('/specifications/delete', materialController.deleteSpecification)


export default router;