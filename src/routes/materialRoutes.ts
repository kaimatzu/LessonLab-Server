import { Router } from 'express';
import materialController from '../controllers/materialController';

const router = Router();

router.post('', materialController.createMaterial);
router.get('/:materialId', materialController.getMaterial);
router.patch('/:materialId', materialController.updateMaterial);
router.delete('/:materialId', materialController.deleteMaterial);

export default router;