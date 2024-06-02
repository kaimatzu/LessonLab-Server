import { Router } from 'express';
import classController from '../controllers/classController';

const router = Router();

router.post('/:userId', classController.createClass)
router.get('/:classId', classController.getClass)
router.get('', classController.getClasses)
router.patch('/:classId/:userId', classController.updateClass)
router.delete('/:classId', classController.deleteClass)
router.get('/:classId/students', classController.getStudents)

export default router;