import { Router } from 'express';
import userController from '../controllers/userController';

const router = Router();

router.post('/login', userController.login)
router.post('/register', userController.register)
router.get('/:userId', userController.getUser)
router.get('', userController.getUsers)
router.patch('/:userId', userController.updateUser)
router.delete('/:userId', userController.deleteUser)

export default router;