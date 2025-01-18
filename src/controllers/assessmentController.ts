import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import jwt from 'jsonwebtoken';

class AssessmentController {

  constructor() {
    this.createAssessment = this.createAssessment.bind(this)
    this.updateAssessment = this.updateAssessment.bind(this)
  }

  /**
   * Creates a quiz based on a module id
   */
  async createAssessment(req: Request, res: Response) {
    // const token = req.cookies.authToken;
    const { moduleId } = req.params

    // if (!token) {
    //   return res.status(403).json({ message: 'No token provided' });
    // }

    // const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { userId: string };
    // if (!decoded) {
    //   return res.status(403).json({ message: 'Invalid token' });
    // }

    if (req.method !== 'POST')
      return res.status(405).json({ message: 'Method Not Allowed' })


    try {
      const connection = await getDbConnection()
      const [rows]: any[] = await connection.execute(
        'SELECT title, content FROM module_ModuleNodes WHERE ModuleID = ? ORDER BY CreateAt',
        [moduleId]
      )

      let text = ''
      for (const row of rows) {
        text += row.title + ' '
        text += row.content + ' '
      }

      console.log('>>> text: ', text)

      await connection.end()

      res.status(200).json({ text })
    } catch (e) {
      console.log('>>> ', e)
    }
  }

  /**
   * Updates an assessment
   */
  async updateAssessment(req: Request, res: Response) {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { userId: string };
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    if (req.method !== 'PATCH')
      return res.status(405).json({ message: 'Method Not Allowed' })


  }
}

export default new AssessmentController();