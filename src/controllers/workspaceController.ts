import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';
import { Int64 } from "@aws-sdk/types";

class WorkspaceController {

  constructor() {
    this.createWorkspace = this.createWorkspace.bind(this)
    this.getWorkspace = this.getWorkspace.bind(this)
    this.getWorkspaces = this.getWorkspaces.bind(this)
    this.updateWorkspace = this.updateWorkspace.bind(this)
    this.deleteWorkspace = this.deleteWorkspace.bind(this)

    this.getSpecifications = this.getSpecifications.bind(this)
    this.insertSpecification = this.insertSpecification.bind(this)
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
  async createWorkspace(req: Request, res: Response) {
    const { workspaceName } = req.body

    const token = req.cookies.authToken;

    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { userId: string, username: string, userType: string, name: string, email: string };

    const workspaceId = uuidv4()

    try {
      const connection = await getDbConnection()
      await connection.execute('INSERT INTO Workspaces (`WorkspaceID`, `WorkspaceName`, `UserID`) VALUES (?, ?, ?)',
        [workspaceId, workspaceName, decoded.userId])

      res.status(201).json({ workspace: { WorkspaceID: workspaceId, WorkspaceName: workspaceName, specificationID: null, WorkspaceType: null } });
      res.send();

      await connection.end();
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
  async getWorkspace(req: Request, res: Response) {
    const workspaceId = req.params.workspaceId
    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('SELECT * FROM Workspaces WHERE WorkspaceID = ?', [workspaceId])
      const rows = result[0]
      await connection.end()

      if (rows.length === 0)
        return res.status(404).json({ error: 'Workspace not found' })

      const workspace = rows[0]

      return res.status(200).json(workspace)
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
  async getWorkspaces(req: Request, res: Response) {
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
          WorkspaceID, 
          WorkspaceName, 
          UserID,
          CreatedAt
        FROM Workspaces
        WHERE UserID = ?
        ORDER BY CreatedAt DESC
      `;

      const rows: any = await connection.execute(query, [decoded.userId]).catch(error => {
        console.error('Error executing query:', error);
        return res.status(500).json({ error: 'DB query execution error' });
      });

      await connection.end().catch(error => {
        console.error('Error closing DB connection:', error);
      });

      if (rows.length === 0) {
        return res.status(200).json([]); // Return an empty JSON array if no workspaces are found
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
  async updateWorkspace(req: Request, res: Response) {
    const workspaceName = req.params.workspaceName;
    const workspaceId = req.params.workspaceId;

    console.log(workspaceId, workspaceName);

    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('UPDATE Workspaces SET WorkspaceName = ? WHERE WorkspaceID = ?', [workspaceName, workspaceId]);
      await connection.end()

      const header = result[0]

      if (header.changedRows === 0) {
        return res.status(404).json({ message: 'Workspace not found' })
      }

      return res.status(200)
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
  async deleteWorkspace(req: Request, res: Response) {
    const workspaceId = req.params.workspaceId;

    try {
      const connection = await getDbConnection()
      const result: any = await connection.execute('DELETE FROM Workspaces WHERE WorkspaceID = ?', [workspaceId])
      await connection.end()

      const header = result[0]

      if (header.affectedRows === 0)
        return res.status(404).json({ error: 'Workspace not found' })

      return res.status(204);
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'DB error ' + error })
    }
  }

  //////////////////////////////////////
  ////////Workspace Specifications///////
  //////////////////////////////////////

  /**
   * Retrieves all the Specifications associated with a given Workspace.
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

    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    try {
      const connection = await getDbConnection();
      const [rows] = await connection.execute(
        `SELECT * FROM Specifications WHERE WorkspaceID = ? ORDER BY CreatedAt`,
        [workspaceId]
      );

      await connection.end();
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching specifications:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Inserts a new Specification associated with a given Workspace.
   *
   * @param req - The request object.
   * @param res - The response object.
   */
  async insertSpecification(req: Request, res: Response) {
    if (req.method !== 'POST') {
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

    const { WorkspaceID } = req.body;

    if (!WorkspaceID) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    try {
      const connection = await getDbConnection();
      const SpecificationID = uuidv4();
      await connection.execute(
        'INSERT INTO Specifications (`SpecificationID`, `Name`, `Topic`, `WritingLevel`, `ComprehensionLevel`, `WorkspaceID`) VALUES (?, ?, ?, ?, ?, ?)',
        [SpecificationID, '', '', 'Elementary', 'Simple', WorkspaceID]);


      await connection.end();
      return res.status(201).json({ message: 'Specification inserted successfully', SpecificationID: SpecificationID });
    } catch (error) {
      console.error('Error inserting specification:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Deletes a Specification associated with a given Workspace.
   * Prevents deleting if it is the last specification associated with the Workspace.
   *
   * @param req - The request object.
   * @param res - The response object.
   */
  async deleteSpecification(req: Request, res: Response) {
    if (req.method !== 'DELETE') {
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

    const { WorkspaceID, SpecificationID } = req.params;

    if (!SpecificationID || !WorkspaceID) {
      return res.status(400).json({ message: 'Specification ID and Workspace ID are required' });
    }

    try {
      const connection = await getDbConnection();

      await connection.execute(
        `DELETE FROM Specifications WHERE SpecificationID = ?`,
        [SpecificationID]
      );

      await connection.end();
      return res.status(200).json({ message: 'Specification deleted successfully' });
    } catch (error) {
      console.error('Error deleting specification:', error);
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

}

export default new WorkspaceController();