import { Router } from 'express';
import materialController from '../controllers/materialController';

const router = Router();

router.post('/material', materialController.createMaterial);
router.get('/material/:materialId', materialController.getMaterial);
router.put('/material/:materialId', materialController.updateMaterial);
router.delete('/material/:materialId', materialController.deleteMaterial);

export default router;