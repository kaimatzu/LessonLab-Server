/**
 * Controller for classes
 */
import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";

class ClassesController {

  constructor() {
    this.createClass = this.createClass.bind(this)
    this.getClass = this.getClass.bind(this)
    this.getClasses = this.getClasses.bind(this)
    this.updateClass = this.updateClass.bind(this)
    this.deleteClass = this.deleteClass.bind(this)
    this.getStudents = this.getStudents.bind(this)
  }

  /**
   * 
   * @param req The request body
   * @param res The response data
   * @returns The response data
   */
  async createClass(req: Request, res: Response) {
    const userId = req.params.userId
    try {
      const connection = await getDbConnection();
      let result: any = await connection.execute('SELECT * FROM Users WHERE UserID = ?', [userId])
      let rows = result[0]

      if (rows.length === 0) {
        await connection.end()
        return res.status(404).json({ error: 'User not found' })
      }

      const user = rows[0]

      if (user.UserType === 'Student') {
        await connection.end()
        return res.status(400).json({ error: 'User is not a teacher' })
      }

      result = await connection.execute('INSERT INTO Classes (TeacherID) VALUES (?)', [userId])
      const header = result[0]
      const classId = header.insertId

      result = await connection.execute('SELECT * FROM Classes WHERE TeacherID = ? AND ClassId = ?', [userId, classId])
      rows = result[0]
      await connection.end()

      if (rows === null || rows.length === 0)
        return res.status(500).json({ error: 'DB internal error' })

      const created = rows[0]

      return res.status(201).json(created)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  /**
   * 
   * @param req The request body
   * @param res The response data
   * @returns The response data
   */
  async getClass(req: Request, res: Response) {
    const classId = req.params.classId;
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT * FROM Classes WHERE ClassID = ?', [classId])
      const rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(404).json({ error: 'Class not found' })

      const classResult = rows[0]

      return res.status(200).json(classResult)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  /**
   *
   * @param req The request body
   * @param res The response data
   * @returns The response data
   */
  async getClasses(req: Request, res: Response) {
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT * FROM Classes')
      const rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(204)

      return res.status(200).json(rows)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  /**
   * @description Changes the teacher of the class
   * @param req The request body
   * @param res The response data
   * @returns The response data
   */
  async updateClass(req: Request, res: Response) {
    const classId = req.params.classId
    const userId = req.params.userId

    try {
      const connection = await getDbConnection()
      let result: any = await connection.execute('SELECT * FROM Users WHERE UserID = ?', [userId])
      let rows = result[0]

      if (rows.length === 0) {
        await connection.end()
        return res.status(404).json({ error: 'User not found' })
      }

      const user = rows[0]

      if (user.UserType === 'Student') {
        await connection.end()
        return res.status(400).json({ erro: 'User is not a teacher' })
      }

      result = await connection.execute('SELECT * FROM Classes WHERE ClassID = ?', [classId])
      rows = result[0]

      if (rows.length === 0) {
        await connection.end()
        return res.status(404).json({ error: 'Class not found' })
      }

      result = await connection.execute('UPDATE Classes SET TeacherID = ? WHERE ClassID = ?', [userId, classId])
      const header = result[0]

      if (header.changedRows !== 1) {
        await connection.end()
        return res.status(500).json({ error: 'DB internal error' })
      }

      result = await connection.execute('SELECT * FROM Classes WHERE ClassId = ?', [classId])
      rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(500).json({ error: 'DB internal error' })

      const updatedClass = rows[0]

      return res.status(200).json(updatedClass)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  /**
   * 
   * @param req The request body
   * @param res The response data
   * 
   * @returns The response data
   */
  async deleteClass(req: Request, res: Response) {
    const classId = req.params.classId;
    try {
      const connection = await getDbConnection()
      let result: any = await connection.execute('SELECT * FROM Classes WHERE ClassID = ?', [classId])
      let rows = result[0]

      if (rows.length === 0) {
        await connection.end()
        return res.status(404).json({ error: 'Class not found' })
      }

      result = await connection.execute('DELETE FROM Classes WHERE ClassID = ?', [classId])
      const header = result[0]
      await connection.end()

      if (header.affectedRows === 0)
        return res.status(500).json({ error: 'DB internal error' })

      res.status(204).send()
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  /**
   * @description Get all students from a class
   * @param req The request body
   * @param res The response data
   * 
   * @returns The response data
   */
  async getStudents(req: Request, res: Response) {
    const classId = req.params.classId;
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT Users.* FROM Enrollments JOIN Users ON Enrollments.StudentID = Users.UserID WHERE Enrollments.ClassID = ?', [classId])
      const rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(204)

      return res.status(200).json(rows)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }

  }
}

export default new ClassesController();