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
      let result: any = await connection.execute('INSERT INTO Materials (`MaterialID`, `MaterialName`, `MaterialType`, `UserID`) VALUES (?, ?, ?, ?)', [materialId, materialName, materialType, decoded.userId])
      // let header = result[0]

      result = await connection.execute('SELECT * FROM Materials WHERE MaterialID = ?', [materialId])
      const rows = result[0]
      const material = rows[0]

      await connection.end()
      return res.status(201).json(material)
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
      const result: any = await connection.execute('SELECT * FROM Materials WHERE UserID = ?', [decoded.userId]).catch(error => {
        console.error('Error executing query:', error);
        return res.status(500).json({ error: 'DB query execution error' });
      });

      const rows = result[0]
      await connection.end().catch(error => {
        console.error('Error closing DB connection:', error);
      });

      if (rows.length === 0) {
        return res.status(200).json([]); // Return an empty JSON array if no materials are found
      }

      return res.status(200).json(rows)
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