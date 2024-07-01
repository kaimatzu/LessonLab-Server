/**
 * Material is the lesson or quiz
 */
import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';

class MaterialsController {

  constructor() {
    this.createMaterial = this.createMaterial.bind(this)
    this.getMaterial = this.getMaterial.bind(this)
    this.getMaterials = this.getMaterials.bind(this)
    this.updateMaterial = this.updateMaterial.bind(this)
    this.deleteMaterial = this.deleteMaterial.bind(this)
  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   */
  async createMaterial(req: Request, res: Response) {
    const { materialName, materialType } = req.body

    const token = req.cookies.authToken;

    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { userId: string, username: string, userType: string, name: string, email: string };

    const materialId = uuidv4()
    
    try {
      const connection = await getDbConnection()
      await connection.execute(
        'INSERT INTO Materials (`MaterialID`, `MaterialName`, `UserID`) VALUES (?, ?, ?)', 
        [materialId, materialName, decoded.userId])

      let entryId: string;

      // Insert into Lessons or Quizzes table based on materialType
      if (materialType === 'LESSON') {
        entryId = uuidv4();
        await connection.execute(
          'INSERT INTO Lessons (LessonID, MaterialID) VALUES (?, ?)',
          [entryId, materialId]
        );
      } else if (materialType === 'QUIZ') {
        entryId = uuidv4();
        await connection.execute(
          'INSERT INTO Quizzes (QuizID, MaterialID) VALUES (?, ?)',
          [entryId, materialId]
        );
      } else {
        await connection.end();
        return res.status(400).json({ message: 'Invalid material type' });
      }

    // Retrieve the created material and corresponding entry
    const query = `
      SELECT 
        m.MaterialID, 
        m.MaterialName, 
        CASE 
          WHEN l.MaterialID IS NOT NULL THEN 'LESSON'
          WHEN q.MaterialID IS NOT NULL THEN 'QUIZ'
          ELSE 'UNKNOWN'
        END AS MaterialType,
        m.UserID
      FROM Materials m
      LEFT JOIN Lessons l ON m.MaterialID = l.MaterialID
      LEFT JOIN Quizzes q ON m.MaterialID = q.MaterialID
      WHERE m.MaterialID = ?
    `;

    const rows: any = await connection.execute(query, [materialId]);
    const material = rows[0];

    await connection.end();
    return res.status(201).json(material[0]);
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error. ' + error })
    }
  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   */
  async getMaterial(req: Request, res: Response) {
    const materialId = req.params.materialId
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT * FROM Materials WHERE MaterialID = ?', [materialId])
      const rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(404).json({ error: 'Material not found' })

      const material = rows[0]

      return res.status(200).json(material)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB connection error' })
    }
  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   */
  async getMaterials(req: Request, res: Response) {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { userId: string, username: string, userType: string, name: string, email: string };

    let connection;
    try {
      connection = await getDbConnection();
    } catch (error) {
      console.error('Error getting DB connection:', error);
      return res.status(500).json({ error: 'DB connection error' });
    }
  
    try {
      const query = `
        SELECT 
          m.MaterialID, 
          m.MaterialName, 
          m.UserID,
          CASE 
            WHEN l.MaterialID IS NOT NULL THEN 'LESSON'
            WHEN q.MaterialID IS NOT NULL THEN 'QUIZ'
            ELSE 'UNKNOWN'
          END AS MaterialType
        FROM Materials m
        LEFT JOIN Lessons l ON m.MaterialID = l.MaterialID
        LEFT JOIN Quizzes q ON m.MaterialID = q.MaterialID
        WHERE m.UserID = ?
        ORDER BY m.CreatedAt DESC
      `;
  
      const rows: any = await connection.execute(query, [decoded.userId]).catch(error => {
        console.error('Error executing query:', error);
        return res.status(500).json({ error: 'DB query execution error' });
      });
  
      await connection.end().catch(error => {
        console.error('Error closing DB connection:', error);
      });
  
      if (rows.length === 0) {
        return res.status(200).json([]); // Return an empty JSON array if no materials are found
      }

      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'DB connection error' });
    }
  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   */
  async updateMaterial(req: Request, res: Response) {
    const materialType = req.body.materialType
    const content = req.body.content
    const title = req.body.title
    const materialId = req.params.materialId

    try {
      const connection = await getDbConnection()
      let result: any = await connection.execute('UPDATE Materials SET MaterialType = ?, Content = ?, Title = ? WHERE MaterialID', [materialType, content, title, materialId])
      const header = result[0]

      if (header.changedRows === 0) {
        await connection.end()
        return res.status(404).json({ message: 'User not found' })
      }

      result = await connection.execute('SELECT * FROM Materials WHERE MaterialID = ?', [materialId])
      const rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(500).json({ error: 'Server error' })

      const material = rows[0]
      return res.status(200).json(material)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error. ' + error })
    }
  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   */
  async deleteMaterial(req: Request, res: Response) {
    const materialId = req.params.materialId;

    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('DLETE FROM Materials WHERE MaterialID = ?', [materialId])
      await connection.end()

      const header = result[0]

      if (header.affectedRows === 0)
        return res.status(404).json({ error: 'Material not found' })

      res.status(204).send()
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }

    res.status(501).send({ message: 'Not implemented' })
  }
}

export default new MaterialsController();