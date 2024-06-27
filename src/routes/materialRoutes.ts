import { Router } from 'express';
import materialController from '../controllers/materialController';

const router = Router();

router.post('/create', materialController.createMaterial)
router.get('/:materialId', materialController.getMaterial)
router.get('', materialController.getMaterials)
router.patch('/:materialId', materialController.updateMaterial)
router.delete('/:materialId', materialController.deleteMaterial)

export default router;