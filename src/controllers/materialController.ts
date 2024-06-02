/**
 * Material is the lesson or quiz
 */
import { Errors } from "@pinecone-database/pinecone";
import { Request, Response } from "express";
import { off } from "process";
import { getDbConnection } from "../utils/storage/database";

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
    const materialType = req.body.materialType
    const content = req.body.content
    const title = req.body.title
    const userId = req.params.userId

    try {
      const connection = await getDbConnection()
      let result: any = await connection.execute('INSERT * INTO Materials VALUES (?, ?, ?, ?)', [materialType, content, title, userId])
      let header = result[0]

      result = await connection.execute('SELECT * FROM Materials WHERE MaterialID = ?', [header.insertId])
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
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT * FROM Materials')
      const rows = result[0]
      await connection.end()

      if (rows.length === 0) {
        res.status(204).send()
        return
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