import { Request, Response } from "express";

class UsersController {

  constructor() {
    this.getUser = this.getUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
    this.enroll = this.enroll.bind(this);
  }

  /**
   * 
   * @param req The request object
   * @param res The response object
   * @returns The response object
   */
  async getUser(req: Request, res: Response) {
    const userId = req.params.userId;
    

    res.status(500).send({ message: "Not implemented" })
  }

  /**
   * 
   * @param req The request object
   * @param res The response object
   * @returns The response object
   */
  async updateUser(req: Request, res: Response) {
    const userId = req.params.userId;

  }

  /**
   * 
   * @param req The request object
   * @param res The response object
   * @returns The response object
   */
  async deleteUser(req: Request, res: Response) {
    const userId = req.params.userId;

  }

  /**
   * 
   * @param req The request object
   * @param res The response object
   * @returns The response
   */
  async enroll(req: Request, res: Response) {
    const userId = req.params.userId;
    const classId = req.params.classId;


  }

}

export default new UsersController();