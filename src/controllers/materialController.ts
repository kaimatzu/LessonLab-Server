/**
 * Material is the lesson or quiz
 */
import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';
import { Int64 } from "@aws-sdk/types";

class MaterialsController {

  constructor() {
    this.createMaterial = this.createMaterial.bind(this)
    this.getMaterial = this.getMaterial.bind(this)
    this.getMaterials = this.getMaterials.bind(this)
    this.updateMaterial = this.updateMaterial.bind(this)
    this.deleteMaterial = this.deleteMaterial.bind(this)

    this.getSpecifications = this.getSpecifications.bind(this)
    this.updateSpecificationName = this.updateSpecificationName.bind(this)
    this.updateSpecificationTopic = this.updateSpecificationTopic.bind(this)
    this.updateSpecificationComprehensionLevel = this.updateSpecificationComprehensionLevel.bind(this)
    this.updateSpecificationWritingLevel = this.updateSpecificationWritingLevel.bind(this)
    this.deleteSpecification = this.deleteSpecification.bind(this)
    this.getAdditionalSpecifications = this.getAdditionalSpecifications.bind(this)
    this.insertAdditionalSpecification = this.insertAdditionalSpecification.bind(this)
    this.updateAdditionalSpecification = this.updateAdditionalSpecification.bind(this)
    this.rearrangeAdditionalSpecification = this.rearrangeAdditionalSpecification.bind(this)
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
        m.UserID,
        m.CreatedAt,
        CASE 
          WHEN l.MaterialID IS NOT NULL THEN 'LESSON'
          WHEN q.MaterialID IS NOT NULL THEN 'QUIZ'
          ELSE 'UNKNOWN'
        END AS MaterialType
      FROM Materials m
      LEFT JOIN Lessons l ON m.MaterialID = l.MaterialID
      LEFT JOIN Quizzes q ON m.MaterialID = q.MaterialID
      WHERE m.MaterialID = ?
    `;

    const rows: any = await connection.execute(query, [materialId]);
    const result = rows[0];
    
    // Insert into Specifications table
    const specificationId = uuidv4();
    await connection.execute(
      'INSERT INTO Specifications (`SpecificationID`, `Name`, `Topic`, `WritingLevel`, `ComprehensionLevel`, `MaterialID`) VALUES (?, ?, ?, ?, ?, ?)', 
      [specificationId, '', '', 'Elementary', 'Simple', materialId]);

    await connection.end();
    const material = result[0];
    return res.status(201).json({ material, specificationID: specificationId });

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
          m.CreatedAt,
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
      const result: any = await connection.execute('DELETE FROM Materials WHERE MaterialID = ?', [materialId])
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

  //////////////////////////////////////
  ////////Material Specifications///////
  //////////////////////////////////////

/**
 * Retrieves all the Specifications associated with a given Material.
 *
 * @param req - The request object.
 * @param res - The response object.
 */

  async getSpecifications(req: Request, res: Response) {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }
  
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    const { materialId } = req.params;

    if (!materialId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    try {
      const connection = await getDbConnection();
      const [rows] = await connection.execute(
        `SELECT * FROM Specifications WHERE MaterialID = ? ORDER BY CreatedAt DESC`,
        [materialId]
      );

      await connection.end();
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching specifications:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

/**
 * Updates the name for a given specification.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async updateSpecificationName(req: Request, res: Response) {
    const { SpecificationID, Name } = req.body;

    const connection = await getDbConnection();

    try {
      await connection.execute(
        'UPDATE Specifications SET Name = ? WHERE SpecificationID = ?',
        [Name, SpecificationID]
      );

      await connection.end();

      return res.status(200).json({ message: 'Specification name updated successfully' });
    } catch (error) {
      console.error("Error updating specification name:", error);
      return res.status(500).json({ error: 'DB connection error' });
    }
  }  

/**
 * Updates the topic for a given specification.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async updateSpecificationTopic(req: Request, res: Response) {
    const { SpecificationID, Topic } = req.body;

    const connection = await getDbConnection();

    try {
      await connection.execute(
        'UPDATE Specifications SET Topic = ? WHERE SpecificationID = ?',
        [Topic, SpecificationID]
      );

      await connection.end();

      return res.status(200).json({ message: 'Specification topic updated successfully' });
    } catch (error) {
      console.error("Error updating specification topic:", error);
      return res.status(500).json({ error: 'DB connection error' });
    }
  }

/**
 * Updates the writing level for a given specification.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async updateSpecificationWritingLevel(req: Request, res: Response) {
    const { SpecificationID, WritingLevel } = req.body;

    const connection = await getDbConnection();

    try {
      await connection.execute(
        'UPDATE Specifications SET WritingLevel = ? WHERE SpecificationID = ?',
        [WritingLevel, SpecificationID]
      );

      await connection.end();

      return res.status(200).json({ message: 'Specification writing level updated successfully' });
    } catch (error) {
      console.error("Error updating specification writing level:", error);
      return res.status(500).json({ error: 'DB connection error' });
    }
  }

/**
 * Updates the comprehension level for a given specification.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async updateSpecificationComprehensionLevel(req: Request, res: Response) {
    const { SpecificationID, ComprehensionLevel } = req.body;

    const connection = await getDbConnection();

    try {
      await connection.execute(
        'UPDATE Specifications SET ComprehensionLevel = ? WHERE SpecificationID = ?',
        [ComprehensionLevel, SpecificationID]
      );

      await connection.end();

      return res.status(200).json({ message: 'Specification comprehension level updated successfully' });
    } catch (error) {
      console.error("Error updating specification comprehension level:", error);
      return res.status(500).json({ error: 'DB connection error' });
    }
  }

/**
 * Retrieves additional specifications for a given SpecificationID.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async getAdditionalSpecifications(req: Request, res: Response) {
    const { SpecificationID } = req.params;

    if (!SpecificationID) {
      return res.status(400).json({ message: 'SpecificationID is required' });
    }

    try {
      const connection = await getDbConnection();

      const [additionalSpecifications]: any = await connection.execute(
        'SELECT * FROM AdditionalSpecifications WHERE SpecificationID = ? ORDER BY PrevID',
        [SpecificationID]
      );

      await connection.end();

      return res.status(200).json({ additionalSpecifications });
    } catch (error) {
      console.error('Error retrieving additional specifications:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }


/**
 * Handles the insertion of a new additional specification.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async insertAdditionalSpecification(req: Request, res: Response) {
    const { SpecificationID, LastAdditionalSpecificationID } = req.body;

    if (!SpecificationID) {
      return res.status(400).json({ message: 'SpecificationID is required' });
    }

    try {
      const connection = await getDbConnection();
      const newSpecId = uuidv4();

      if (LastAdditionalSpecificationID) {
        // Insert new specification with PrevID as LastAdditionalSpecificationID
        await connection.execute(
          'INSERT INTO AdditionalSpecifications (AdditionalSpecID, SpecificationID, SpecificationText, PrevID) VALUES (?, ?, ?, ?)',
          [newSpecId, SpecificationID, '', LastAdditionalSpecificationID]
        );

        // Update the previous specification's NextID to the new specification ID
        await connection.execute(
          'UPDATE AdditionalSpecifications SET NextID = ? WHERE AdditionalSpecID = ?',
          [newSpecId, LastAdditionalSpecificationID]
        );
      } else {
        // Insert new specification with PrevID and NextID as null (first in the list)
        await connection.execute(
          'INSERT INTO AdditionalSpecifications (AdditionalSpecID, SpecificationID, SpecificationText, PrevID, NextID) VALUES (?, ?, ?, NULL, NULL)',
          [newSpecId, SpecificationID, '']
        );
      }

      await connection.end();

      return res.status(201).json({ newSpecId });
    } catch (error) {
      console.error('Error inserting additional specification:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

/**
 * Updates an additional specification.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async updateAdditionalSpecification(req: Request, res: Response) {
    const { AdditionalSpecID, SpecificationText } = req.body;

    console.log(AdditionalSpecID, SpecificationText);

    if (!AdditionalSpecID || !SpecificationText) {
      return res.status(400).json({ message: 'AdditionalSpecID and SpecificationText are required' });
    }

    try {
      const connection = await getDbConnection();

      const [existingSpec]: any = await connection.execute(
        'SELECT AdditionalSpecID FROM AdditionalSpecifications WHERE AdditionalSpecID = ?',
        [AdditionalSpecID]
      );

      if (existingSpec.length === 0) {
        await connection.end();
        return res.status(404).json({ message: 'Additional specification not found' });
      }

      await connection.execute(
        'UPDATE AdditionalSpecifications SET SpecificationText = ? WHERE AdditionalSpecID = ?',
        [SpecificationText, AdditionalSpecID]
      );

      await connection.end();

      return res.status(200).json({ message: 'Additional specification updated successfully' });
    } catch (error) {
      console.error('Error updating additional specification:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };

/**
 * Handles the removal of an additional specification.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async removeAdditionalSpecification(req: Request, res: Response) {
    const { AdditionalSpecID } = req.params;

    if (!AdditionalSpecID) {
      return res.status(400).json({ message: 'AdditionalSpecID is required' });
    }

    try {
      const connection = await getDbConnection();

      // Get the current specification
      const [currentSpec]: any = await connection.execute(
        'SELECT SpecificationID, PrevID, NextID FROM AdditionalSpecifications WHERE AdditionalSpecID = ?',
        [AdditionalSpecID]
      );

      if (currentSpec.length === 0) {
        return res.status(404).json({ message: 'Additional specification not found' });
      }

      const { SpecificationID, PrevID, NextID } = currentSpec[0];

      // Update the previous specification's NextID
      if (PrevID) {
        await connection.execute(
          'UPDATE AdditionalSpecifications SET NextID = ? WHERE AdditionalSpecID = ?',
          [NextID, PrevID]
        );
      }

      // Update the next specification's PrevID
      if (NextID) {
        await connection.execute(
          'UPDATE AdditionalSpecifications SET PrevID = ? WHERE AdditionalSpecID = ?',
          [PrevID, NextID]
        );
      }

      // Delete the current specification
      await connection.execute(
        'DELETE FROM AdditionalSpecifications WHERE AdditionalSpecID = ?',
        [AdditionalSpecID]
      );

      await connection.end();

      return res.status(200).json({ message: 'Additional specification removed' });
    } catch (error) {
      console.error('Error removing additional specification:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }


/**
 * Handles the rearrangement of additional specifications.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async rearrangeAdditionalSpecification(req: Request, res: Response) {
    const { specToMoveId, newPrevId, newNextId } = req.body;

    if (!specToMoveId) {
      return res.status(400).json({ message: 'specToMoveId is required' });
    }

    try {
      const connection = await getDbConnection();

      const [specToMove]: any = await connection.execute(
        'SELECT * FROM AdditionalSpecifications WHERE AdditionalSpecID = ?',
        [specToMoveId]
      );

      if (specToMove.length === 0) {
        await connection.end();
        return res.status(404).json({ message: 'Specification not found' });
      }

      const spec = specToMove[0];

      // Update the previous and next specifications to bypass the specToMove
      if (spec.PrevID) {
        await connection.execute(
          'UPDATE AdditionalSpecifications SET NextID = ? WHERE AdditionalSpecID = ?',
          [spec.NextID, spec.PrevID]
        );
      }

      if (spec.NextID) {
        await connection.execute(
          'UPDATE AdditionalSpecifications SET PrevID = ? WHERE AdditionalSpecID = ?',
          [spec.PrevID, spec.NextID]
        );
      }

      // Set new prev and next
      await connection.execute(
        'UPDATE AdditionalSpecifications SET PrevID = ?, NextID = ? WHERE AdditionalSpecID = ?',
        [newPrevId, newNextId, specToMoveId]
      );

      if (newPrevId) {
        await connection.execute(
          'UPDATE AdditionalSpecifications SET NextID = ? WHERE AdditionalSpecID = ?',
          [specToMoveId, newPrevId]
        );
      }

      if (newNextId) {
        await connection.execute(
          'UPDATE AdditionalSpecifications SET PrevID = ? WHERE AdditionalSpecID = ?',
          [specToMoveId, newNextId]
        );
      }

      await connection.end();

      return res.status(200).json({ message: 'Specification rearranged successfully' });
    } catch (error) {
      console.error('Error rearranging additional specification:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

/**
 * Deletes the specification for a given material.
 *
 * @param req - The request object.
 * @param res - The response object.
 */
  async deleteSpecification(req: Request, res: Response) {
    const { SpecificationID, MaterialID } = req.body;

    const connection = await getDbConnection();
    try {
      
      await connection.beginTransaction();

      // Delete additional specifications
      await connection.execute(
        'DELETE FROM AdditionalSpecifications WHERE SpecificationID = ?',
        [SpecificationID]
      );

      // Delete the specification
      await connection.execute(
        'DELETE FROM Specifications WHERE MaterialID = ? AND SpecificationID = ?',
        [MaterialID, SpecificationID]
      );

      await connection.commit();
      await connection.end();

      return res.status(200).json({ message: 'Specification deleted successfully' });
    } catch (error) {
      console.error("Error deleting specification:", error);
      if (connection) await connection.rollback();
      return res.status(500).json({ error: 'DB connection error' });
    }
  }
}

export default new MaterialsController();