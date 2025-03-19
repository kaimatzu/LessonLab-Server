import { Router } from 'express';
import { Request, Response } from 'express';
import userController from '../controllers/userController';
import multer from 'multer';
import { getDbConnection } from '../utils/storage/database';

const router = Router();
const upload = multer(); // accepts form-data instead of raw json payloads

router.get('/tokens', async (req: Request, res: Response) => {
  try {
    const connection = await getDbConnection();
    const [rows]: any = await connection.execute('SELECT Tokens FROM Users WHERE UserID = ?', [req.query.userId]);
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ tokens: rows[0].Tokens });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'DB connection error' });
  }
})

router.post('/login', upload.none(), userController.login)
router.post('/auto-login', userController.authenticateAutoLogin, async (req: Request, res: Response) => {

  // const user = req.body.user;
  // console.log('>>> LOG: user: ', user)

  // const connection = await getDbConnection();

  // const [rows]: any = await connection.execute(`SELECT Tokens FROM Users WHERE UserID=?`, [user.userId])

  // await connection.end();

  // const tokens = rows[0].Tokens;
  // console.log('>>> LOG: tokens: ', tokens)

  // const returnUser = { ...user, tokens }
  // console.log('>>> LOG: returnUser: ', returnUser)

  const user = req.body.user
  res.status(200).json({ user });
});
router.post('/logout', userController.authenticateLogout, userController.logout);
router.post('/register', upload.none(), userController.register)
router.get('/:userId', userController.getUser)
router.get('', userController.getUsers)
router.patch('/:userId', upload.none(), userController.updateUser)
router.delete('/:userId', userController.deleteUser)

export default router;