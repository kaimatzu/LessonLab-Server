/**
 * Material is the lesson or quiz
 */
import { Request, Response } from "express";

class MaterialsController {

  constructor() {
    this.createMaterial = this.createMaterial.bind(this);
    this.getMaterial = this.getMaterial.bind(this);
    this.updateMaterial = this.updateMaterial.bind(this);
    this.deleteMaterial = this.deleteMaterial.bind(this);
  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   * @returns The response data
   */
  async createMaterial(req: Request, res: Response) {
    res.status(200).send({ 'message': 'test-success' })
  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   * @returns The response data
   */
  async getMaterial(req: Request, res: Response) {
    const materialId = req.params.materialId;

  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   * @returns The response data
   */
  async updateMaterial(req: Request, res: Response) {
    const materialId = req.params.materialId;
  }

  /**
   * 
   * @param req The request object
   * @param res The response data
   * @returns The response data
   */
  async deleteMaterial(req: Request, res: Response) {
    const materialId = req.params.materialId;

  }
}

export default new MaterialsController();