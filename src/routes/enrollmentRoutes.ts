import { Router } from 'express';
import enrollmentController from '../controllers/enrollmentController';

const router = Router();

router.post('/:userId/:classId', enrollmentController.enroll)
router.get('', enrollmentController.getEnrollments)

export default router;