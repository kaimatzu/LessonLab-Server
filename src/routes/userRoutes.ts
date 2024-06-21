import { Router } from 'express';
import { Request, Response } from 'express';
import userController from '../controllers/userController';
import multer from 'multer';

const router = Router();
const upload = multer(); // accepts form-data instead of raw json payloads

router.post('/login', upload.none(), userController.login)
router.post('/auto-login', userController.authenticateAutoLogin, (req: Request, res: Response) => {
    const user = req.body.user;
    res.status(200).json({ user });
});
router.post('/logout', userController.authenticateLogout, userController.logout);
router.post('/register', upload.none(), userController.register)
router.get('/:userId', userController.getUser)
router.get('', userController.getUsers)
router.patch('/:userId', upload.none(), userController.updateUser)
router.delete('/:userId', userController.deleteUser)

export default router;