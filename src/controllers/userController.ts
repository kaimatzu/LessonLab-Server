import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid'; 
import { getDbConnection } from "../utils/storage/database";
import { checkPassword, createJwtToken, generateHash } from "../utils/auth";

class UsersController {
  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.getUser = this.getUser.bind(this);
    this.getUsers = this.getUsers.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
  }

  async register(req: Request, res: Response) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  
    const { username, password, userType, name, email } = req.body;
    const userId = uuidv4(); // Generate a UUID for the UserID
  
    try {
      const connection = await getDbConnection();
      const [rows]: any = await connection.execute("SELECT `UserID` FROM `Users` WHERE `Username`=? OR `Email`=?", [username, email]);
  
      if (rows.length > 0) {
        await connection.end();
        return res.status(400).json({ message: 'User already exists' });
      }
  
      const hashedPassword = generateHash(password);
  
      await connection.execute(
        'INSERT INTO Users (UserID, UserType, Name, Username, Password, Email) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, userType, name, username, hashedPassword, email]
      );
  
      const token = createJwtToken(userId); // Create a JWT token
  
      await connection.end();
  
      return res.status(201).json({
        token,
        user: {
          UserID: userId,
          UserType: userType,
          Name: name,
          Tokens: 0 // Default tokens to 0
        }
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'DB error ' + error });
    }
  }

  async login(req: Request, res: Response) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { identifier, password } = req.body; // Accept either username or email as "identifier"
    const isEmail = /\S+@\S+\.\S+/.test(identifier); // Check if the identifier is an email

    try {
      const connection = await getDbConnection();
      const query = isEmail
        ? 'SELECT UserID, Password, UserType, Name, Email, Tokens FROM Users WHERE Email = ?'
        : 'SELECT UserID, Password, UserType, Name, Email, Tokens FROM Users WHERE Username = ?';

      const [rows]: any = await connection.execute(query, [identifier]);

      if (rows.length === 0) {
        await connection.end();
        return res.status(401).json({ message: 'User not found' });
      }

      const user = rows[0];
      const isPasswordValid = checkPassword(user.Password, password);

      if (!isPasswordValid) {
        await connection.end();
        return res.status(401).json({ message: 'Incorrect password' });
      }

      const token = createJwtToken(user.UserID); // Use UserID to create JWT token

      await connection.end();

      // Return user data excluding sensitive information
      const { UserID, UserType, Name, Email, Tokens } = user;
      return res.status(200).json({
        token,
        user: {
          UserID,
          UserType,
          Name,
          Tokens
        }
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'DB connection error' });
    }
  }

  async getUser(req: Request, res: Response) {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const userId = req.params.userId;

    try {
      const connection = await getDbConnection();
      const [rows]: any = await connection.execute('SELECT * FROM Users WHERE UserID = ?', [userId]);

      if (rows.length === 0) {
        await connection.end();
        return res.status(404).json({ message: "User not found" });
      }

      const user = rows[0];
      await connection.end();
      return res.status(200).json(user);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "DB connection error" });
    }
  }

  async getUsers(req: Request, res: Response) {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
      const connection = await getDbConnection();
      const [rows]: any = await connection.execute('SELECT * FROM Users');
      await connection.end();

      if (rows.length === 0) {
        return res.status(204).send();
      }

      return res.status(200).json(rows);
    } catch (error) {
      console.error(error)
      return res.status(500).json({ message: "DB error " + error })
    }
  }

  async updateUser(req: Request, res: Response) {
    if (req.method !== 'PUT') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const userId = req.params.userId;
    const { userType } = req.body;

    try {
      const connection = await getDbConnection();
      const [resultHeader]: any = await connection.execute('UPDATE Users SET UserType = ? WHERE UserID = ?', [userType, userId]);
      const header = resultHeader[0];

      if (header.changedRows !== 1) {
        await connection.end();
        return res.status(404).json({ message: 'User not found' });
      }

      const [userResult]: any = await connection.execute('SELECT * FROM Users WHERE UserID = ?', [userId]);
      const rows = userResult[0];

      if (rows.length === 0) {
        await connection.end();
        return res.status(500).json({ message: 'DB internal error' });
      }

      const user = rows[0];
      await connection.end();
      return res.status(200).json(user);
    } catch (error) {
      console.error(error)
      return res.status(500).json({ message: 'DB error ' + error })
    }
  }

  async deleteUser(req: Request, res: Response) {
    if (req.method !== 'DELETE') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const userId = req.params.userId;

    try {
      const connection = await getDbConnection();
      const [result]: any = await connection.execute('DELETE FROM Users WHERE UserID = ?', [userId]);
      await connection.end();

      const header = result[0];

      if (header.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(204).send();
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
