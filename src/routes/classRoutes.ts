import { Router } from 'express';
import classController from '../controllers/classController';

const router = Router();

router.post('', classController.createClass)
router.get('/:classId', classController.getClass)
router.patch('/:classId', classController.udpateClass)
router.delete('/:classId', classController.deleteClass)
router.get('students/:classId', classController.getStudents)

export default router;