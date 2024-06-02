import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import { connect } from "http2";
import { checkPassword, createJwtToken, generateHash } from "../utils/auth";

class UsersController {

  constructor() {
    this.register = this.register.bind(this)
    this.login = this.login.bind(this)
    this.getUser = this.getUser.bind(this)
    this.getUsers = this.getUsers.bind(this)
    this.updateUser = this.updateUser.bind(this)
    this.deleteUser = this.deleteUser.bind(this)
  }

  /**
   * 
   * @param req The request body
   * @param res The response body
   */
  async register(req: Request, res: Response) {
    const username = req.body.username
    const password = req.body.password

    try {
      const connection = await getDbConnection()
      const [rows]: any = await connection.execute("SELECT `UserID` FROM `Users` WHERE `Username`=?", [username]);

      if (rows.length > 0) {
        await connection.end()
        return res.status(400).json({ error: 'User already exist' })
      }

      const hashedPassword = generateHash(password)

      await connection.execute('INSERT INTO Users (Username, Password) VALUES (?, ?)', [username, hashedPassword])

      await connection.end()
      res.status(201).json({ message: 'User registered ' }).send()
      return
    } catch (error) {
      console.log(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  /**
   * 
   * @param req The request body
   * @param res The response body
   */
  async login(req: Request, res: Response) {
    const username = req.body.username
    const password = req.body.password

    try {
      const connection = await getDbConnection()
      const [rows]: any = await connection.execute('SELECT UserID, Password FROM Users WHERE Username = ?', [username])

      if (rows.length === 0) {
        await connection.end()
        return res.status(401).json({ error: 'User not found' })
      }

      const user = rows[0]
      const isPasswordValid = checkPassword(user.Password, password)

      if (!isPasswordValid) {
        await connection.end()
        return res.status(401).json({ error: 'Incorrect password' })
      }

      const token = createJwtToken(username)
      await connection.end()

      res.status(200).send(token)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  /**
   * 
   * @param req The request object
   * @param res The response object
   */
  async getUser(req: Request, res: Response) {
    const userId = req.params.userId;
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT * FROM Users WHERE UserID = ?', [userId])
      const rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(404).json({ message: "User not found" })

      const user = rows[0]

      return res.status(200).json(user)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ message: "DB error " + error })
    }
  }

  /**
   * 
   * @param req The request object
   * @param res The response object
   */
  async getUsers(req: Request, res: Response) {
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT * FROM Users')
      const rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(204)

      return res.status(200).json(rows)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ message: "DB error " + error })
    }
  }

  /**
   * 
   * @param req The request object
   * @param res The response object
   */
  async updateUser(req: Request, res: Response) {
    const userId = req.params.userId
    const userType = req.body.userType
    try {
      const connection = await getDbConnection();
      const resultHeader: any = await connection.execute('UPDATE Users SET UserType = ? WHERE UserID = ?', [userType, userId])
      const header = resultHeader[0]

      if (header.changedRows !== 1)
        return res.status(404).json({ message: 'User not found' })

      const userResult: any = await connection.execute('SELECT * FROM Users  WHERE UserID = ?', [userId])
      const rows = userResult[0]

      if (rows.length === 0) {
        await connection.end()
        return res.status(500).json({ message: 'DB internal error' })
      }

      const user = rows[0]

      await connection.end()
      return res.status(200).json(user)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ message: 'DB error ' + error })
    }
  }

  /**
   * 
   * @param req The request object
   * @param res The response object
   */
  async deleteUser(req: Request, res: Response) {
    const userId = req.params.userId;

    try {
      const connection = await getDbConnection();
      const result: any = await connection.execute('DELETE FROM Users WHERE UserID = ?', [userId])
      await connection.end()

      const header = result[0]

      if (header.affectedRows === 0)
        return res.status(404).json({ error: 'User not found' })

      res.status(204).send()
    } catch (error) {
      console.log(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  // async logout(req: Request, res: Response) {
  //   try {
  //     const connection = await getDbConnection()
  //     // const result = await connection.execute('')
  //     await connection.end()

  //   } catch (error) {
  //     console.error(error)
  //     return res.status(500).json({ error: 'DB error ' + error })
  //   }
  // }

}

export default new UsersController();