import { Request, Response } from "express";
import fs from "fs";

class ExportController {

  constructor() {
    this.createExport = this.createExport.bind(this)
    this.deleteExport = this.deleteExport.bind(this)
  }

  /**
   * Creates an export file in the filesystem
   * @param req The request body
   * @param res The response body
   * @returns The response data
   */
  async createExport(req: Request, res: Response) {
    const { data, filename } = req.body
    try {
      fs.writeFile(__dirname + `/../../exports/` + `${filename}.gift`, data, () => { })
      console.log('LOG: File created')
      return res.status(201).json({ fileName: `${filename}.gift`, data })
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Write file error ' + error })
    }
  }

  /**
   * Deletes an export file in the filesystem
   * @param req The request body
   * @param res The response body
   * @returns The response data
   */
  async deleteExport(req: Request, res: Response) {
    const { filename } = req.body
    console.log('LOG: Deleting file')
    try {
      fs.unlink(__dirname + `/../../exports/` + `${filename}.gift`, (error) => {
        if (error) {
          return res.status(500).json({ message: 'Delete file error ' + error })
        }
      })
      console.log('LOG: File deleted')
      return res.status(204)
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Delete file error ' + error })
    }
  }

}

export default new ExportController()