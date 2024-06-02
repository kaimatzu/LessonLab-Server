
import { Request, Response } from 'express'
import { getDbConnection } from "../utils/storage/database";

class EnrollmentsController {

  constructor() {
    this.enroll = this.enroll.bind(this)
    this.getEnrollments = this.getEnrollments.bind(this)
  }

  /**
   * @description If the user is a student then this function can enroll the user to a class 
   * @param req The request object
   * @param res The response object
   */
  async enroll(req: Request, res: Response) {
    const userId = req.params.userId;
    const classId = req.params.classId;

    try {
      const connection = await getDbConnection()
      const check: any = await connection.execute('SELECT * FROM Users WHERE UserID = ?', [userId])
      let rows = check[0]

      if (rows.length === 0)
        return res.status(404).json({ message: 'User not found' })

      const user = rows[0]

      if (user.UserType === 'Teacher') {
        await connection.end()
        return res.status(400).json({ error: 'User is not a student' })
      }

      const result: any = await connection.execute('SELECT * FROM Classes WHERE ClassID = ?', [classId])
      rows = result[0]

      if (rows.length === 0) {
        await connection.end()
        return res.status(404).json({ error: 'Class not found' })
      }

      connection.execute('INSERT INTO Enrollments (StudentID, ClassID) VALUES (?, ?)', [userId, classId])
      await connection.end()

      return res.status(201).json({ UserID: userId, ClassID: classId })
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
  async getEnrollments(req: Request, res: Response) {
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT * FROM Enrollments')
      const rows = result[0]
      await connection.end()

      if (rows.length === 0) {
        res.status(204).send()
        return
      }

      return res.status(200).json(rows)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }
}

export default new EnrollmentsController()