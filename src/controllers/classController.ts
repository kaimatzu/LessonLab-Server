/**
 * Controller for classes
 */
import { Request, Response } from "express";

class ClassesController {

  constructor() {
    this.createClass = this.createClass.bind(this)
    this.getClass = this.getClass.bind(this)
    this.udpateClass = this.udpateClass.bind(this)
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

    res.status(501).send({ message: 'Not implemented' })
  }

  /**
   * 
   * @param req The request body
   * @param res The response data
   * @returns The response data
   */
  async getClass(req: Request, res: Response) {
    const classId = req.params.classId;

    res.status(501).send({ message: 'Not implemented' })
  }

  /**
   * 
   * @param req The request body
   * @param res The response data
   * @returns The response data
   */
  async udpateClass(req: Request, res: Response) {
    const classId = req.params.classId;

    res.status(501).send({ message: 'Not implemented' })
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

    res.status(501).send({ message: 'Not implemented' })
  }

  /**
   * 
   * @param req The request body
   * @param res The response data
   * 
   * @returns The response data
   */
  async getStudents(req: Request, res: Response) {
    const classId = req.params.classId;

    res.status(501).send({ message: 'Not implemented' })
  }
}

export default new ClassesController();