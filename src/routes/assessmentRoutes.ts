import { Router } from 'express';
import asessmentController from '../controllers/assessmentController';

const router = Router();

router.post('/:moduleId', asessmentController.createAssessment);
router.put('/:assessmentId', asessmentController.updateAssessment);
export default router;