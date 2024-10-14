import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';
import Server from "../index";
import { serializeTuple } from "../socketServer";

class ModuleController {

  constructor() {
    this.createModule = this.createModule.bind(this);
    this.createModuleCallback = this.createModuleCallback.bind(this);
    this.insertChildToModuleNode = this.insertChildToModuleNode.bind(this);
    this.insertChildToModuleNodeCallback = this.insertChildToModuleNodeCallback.bind(this);
    this.updateModuleName = this.updateModuleName.bind(this);
    this.deleteModule = this.deleteModule.bind(this);
    this.getModules = this.getModules.bind(this);
    this.getModuleTree = this.getModuleTree.bind(this);
    this.getSubtree = this.getSubtree.bind(this);
    this.getSubtreeRecursively = this.getSubtreeRecursively.bind(this);
    this.updateModuleNodeContent = this.updateModuleNodeContent.bind(this);
    this.updateModuleNodeContentCallback = this.updateModuleNodeContentCallback.bind(this);
    this.updateModuleNodeTitle = this.updateModuleNodeTitle.bind(this);
    this.updateModuleNodeTitleCallback = this.updateModuleNodeTitleCallback.bind(this);
    this.deleteModuleNode = this.deleteModuleNode.bind(this);
    this.deleteModuleNodeCallback = this.deleteModuleNodeCallback.bind(this);
  }

  /**
  * Creates a new module tree with a single module root node. Each module root node acts as a separate module.
  * 
  * @param req The request object, expected to contain the pageId, new title, and the lessonId.
  * @param res The response object.
  */ 
  async createModule(req: Request, res: Response) {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { userId: string };
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  
    const { name, description, workspaceId } = req.body;
    if (!name || !workspaceId) {
      return res.status(400).json({ message: 'Module name is required' });
    }
  
    try {
      const connection = await getDbConnection();
      const moduleId = uuidv4();
  
      // Create the new module
      await connection.execute(
        'INSERT INTO module_Modules (ModuleID, Name, Description, WorkspaceID) VALUES (?, ?, ?, ?)',
        [moduleId, name, description ? description : '', workspaceId]
      );
  
      // Create a root module node or initial structure
      await connection.execute(
        'INSERT INTO module_ModuleNodes (ModuleNodeID, Title, Content, ModuleID) VALUES (?, ?, ?, ?)',
        [moduleId, '', '', moduleId]
      );

      await connection.execute(
        'INSERT INTO module_ModuleClosureTable (ModuleID, Ancestor, Descendant, Depth, Position) VALUES (?, ?, ?, 0, 0)',
        [moduleId, moduleId, moduleId]
      );
  
      await connection.end();
      return res.status(201).json({ message: 'Module created successfully', moduleId: moduleId, moduleNodeID: moduleId });
    } catch ( error ) {
      console.error('Error creating module:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
  * Creates a new module tree with a single module root node. Each module root node acts as a separate module.
  * Meant for internal server use and not exposed to the user API routes.
  * 
  * @param name The Module's name.
  * @param description  The Module's description. This will be used by the AI model to generate the content.
  * @param workspaceId The Module's workspace to add to.
  */ 
  async createModuleCallback(name: string, description: string, workspaceId: string, createdModuleId?: string) {
    try {
      const connection = await getDbConnection();
      const moduleId = createdModuleId ? createdModuleId : uuidv4();
  
      // Create the new module
      await connection.execute(
        'INSERT INTO module_Modules (ModuleID, Name, Description, WorkspaceID) VALUES (?, ?, ?, ?)',
        [moduleId, name, description, workspaceId]
      );
  
      // Create a root module node or initial structure
      await connection.execute(
        'INSERT INTO module_ModuleNodes (ModuleNodeID, Title, Content, ModuleID) VALUES (?, ?, ?, ?)',
        [moduleId, '', '', moduleId]
      );

      await connection.execute(
        'INSERT INTO module_ModuleClosureTable (ModuleID, Ancestor, Descendant, Depth, Position) VALUES (?, ?, ?, 0, 0)',
        [moduleId, moduleId, moduleId]
      );
  
      await connection.end();
      return ({ message: 'Module created successfully', moduleId: moduleId, moduleNodeID: moduleId });
    } catch ( error ) {
      console.error('Error creating module:', error);
      return ({ message: 'Internal Server Error' });
    }
  }

  /**
  * Fetches all modules of a workspace.
  * 
  * @param req - The express request object.
  * @param res - The express response object.
  */
  async getModules(req: Request, res: Response) {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  
    const { moduleId: workspaceId } = req.params;
  
    if (!workspaceId) {
      return res.status(400).json({ message: "Module ID" });
    }
  
    try {
      const connection = await getDbConnection();
      const [rows]: any[] = await connection.execute(
        `SELECT * FROM module_Modules WHERE WorkspaceID = ? ORDER BY CreatedAt`,
        [workspaceId]
      );

      await connection.end();
  
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching subtree:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Updates the name of a module in a workspace.
   *
   * @param req - The express request object.
   * @param res - The express response object.
   */
  async updateModuleName(req: Request, res: Response) {
    const token = req.cookies.authToken;

    // Check for the token
    if (!token) {
      return res.status(403).end(); // No token provided, return 403
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);
    if (!decoded) {
      return res.status(403).end(); // Invalid token, return 403
    }

    // Check for the correct HTTP method
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      return res.status(405).end(); // Method not allowed
    }

    const workspaceId = req.params.workspaceId;
    const moduleId = req.params.moduleId;
    const newName = req.params.name;

    // Validate workspaceId and newName
    if (!workspaceId || !newName) {
      return res.status(400).end(); // Bad request if either is missing
    }

    try {
      const connection = await getDbConnection();

      // Update the module name in the database
      await connection.execute(
          `UPDATE module_Modules SET Name = ? WHERE WorkspaceID = ? AND ModuleID = ?`,
          [newName, workspaceId, moduleId]
      );

      await connection.end();

      res.status(204).end(); // No content, successful update
    } catch (error) {
      console.error('Error updating module name:', error);
      res.status(500).end(); // Internal server error
    }
  }

  /**
   * Deletes a module from a workspace.
   *
   * @param req - The express request object.
   * @param res - The express response object.
   */
  async deleteModule(req: Request, res: Response) {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(403).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    if (req.method !== 'DELETE') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { moduleId } = req.params; // Get moduleId from request parameters

    if (!moduleId) {
      return res.status(400).json({ message: "Module ID is required" });
    }

    try {
      const connection = await getDbConnection();

      // Delete the module from the database
      const result: any = await connection.execute(
          `DELETE FROM module_Modules WHERE ModuleID = ?`, // Assuming the column name is `id`
          [moduleId]
      );
      const header = result[0];

      await connection.end();

      if (header.changedRows === 0) {
        return res.status(404).json({ message: 'Module not found' }); // Handle case where no rows were deleted
      }

      res.status(204).end(); // No content, successful deletion
    } catch (error) {
      console.error('Error deleting module:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
  * Inserts a new child node under a specific module node.
  * 
  * @param req The request object, expected to contain the parent node ID, module ID, content, and title.
  * @param res The response object.
  */ 
  async insertChildToModuleNode(req: Request, res: Response) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  
    const { parentNodeId, moduleId, content, title } = req.body;
    if (!parentNodeId || !moduleId) {
      return res.status(400).json({ message: 'Parent Node ID and Module ID are required' });
    }
  
    try {
      const connection = await getDbConnection();
  
      // Check if the module and parent node exist
      const [moduleExists]: any = await connection.execute(
        'SELECT COUNT(*) AS count FROM module_Modules WHERE ModuleID = ?',
        [moduleId]
      );
      const [parentNodeExists]: any = await connection.execute(
        'SELECT COUNT(*) AS count FROM module_ModuleNodes WHERE ModuleNodeID = ?',
        [parentNodeId]
      );
  
      if (moduleExists[0].count === 0 || parentNodeExists[0].count === 0) {
        return res.status(404).json({ message: 'Module or Parent Node does not exist' });
      }
  
      const moduleNodeID = uuidv4();
  
      // Insert new module node as a child
      await connection.execute(
        'INSERT INTO module_ModuleNodes (ModuleNodeID, Title, Content, ModuleID) VALUES (?, ?, ?, ?)',
        [moduleNodeID, title, content, moduleId]
      );
  
      // Calculate the new position as the count of current siblings
      const [positionData]: any = await connection.execute(
        `SELECT COUNT(*) AS siblingCount FROM module_ModuleClosureTable 
        WHERE Ancestor = ? AND Depth = (SELECT Depth + 1 FROM module_ModuleClosureTable WHERE Descendant = ? AND ModuleID = ?) 
        AND ModuleID = ?`,
        [parentNodeId, parentNodeId, moduleId, moduleId]
      );

      console.log("Position Data", positionData[0].siblingCount, positionData[0]);

      const newPosition = positionData[0].siblingCount;

      // First, fetch the depth separately
      const [depthResult]: any = await connection.execute(
        `SELECT Depth FROM module_ModuleClosureTable WHERE Descendant = ? AND ModuleID = ?`,
        [parentNodeId, moduleId]
      );

      const newDepth = depthResult[0].Depth + 1;

      // Now perform the insert
      await connection.execute(
        `INSERT INTO module_ModuleClosureTable (ModuleID, Ancestor, Descendant, Depth, Position)
        VALUES (?, ?, ?, ?, ?)`,
        [moduleId, parentNodeId, moduleNodeID, newDepth, newPosition]
      );

      await connection.end();
      return res.status(201).json({ message: 'Module node child added successfully', moduleNodeID: moduleNodeID });
    } catch (error) {
      console.error('Error inserting module node child:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }    

  /**
  * Inserts a new child node under a specific module node.
  * Meant for internal server use and not exposed to the user API routes.
  * 
  * @param parentNodeId The parent/ancestor of the new node to be inserted.
  * @param moduleId The Module to insert the node in.
  * @param content The node's content.
  * @param title The node's title.
  */ 
  async insertChildToModuleNodeCallback(parentNodeId: string, moduleId: string, moduleNodeId: string, content: string, title: string, position: number, depth: number) {
    try {
      const connection = await getDbConnection();
  
      // Check if the module and parent node exist
      const [moduleExists]: any = await connection.execute(
        'SELECT COUNT(*) AS count FROM module_Modules WHERE ModuleID = ?',
        [moduleId]
      );
      const [parentNodeExists]: any = await connection.execute(
        'SELECT COUNT(*) AS count FROM module_ModuleNodes WHERE ModuleNodeID = ?',
        [parentNodeId]
      );
  
      if (moduleExists[0].count === 0 || parentNodeExists[0].count === 0) {
        return ({ message: 'Module or Parent Node does not exist' });
      }
  
      const moduleNodeID = moduleNodeId;
  
      // Insert new module node as a child
      await connection.execute(
        'INSERT INTO module_ModuleNodes (ModuleNodeID, Title, Content, ModuleID) VALUES (?, ?, ?, ?)',
        [moduleNodeID, title, content, moduleId]
      );

      // Perform the insert
      await connection.execute(
        `INSERT INTO module_ModuleClosureTable (ModuleID, Ancestor, Descendant, Depth, Position)
        VALUES (?, ?, ?, ?, ?)`,
        [moduleId, parentNodeId, moduleNodeID, depth, position]
      );

      await connection.end();
      return ({ message: 'Module node child added successfully', moduleNodeID: moduleNodeID });
    } catch (error) {
      console.error('Error inserting module node child:', error);
      return ({ message: 'Internal Server Error' });
    }
  }   

  /**
  * Builds a hierarchical tree from a flat array of node relationships.
  * @param nodes - Flat array of nodes from the database.
  */
  buildFullTree(nodes: any[]) {
    const nodeMap = new Map<string, any>();
    nodes.forEach(node => {
      node.Children = [];
      nodeMap.set(node.Descendant, node);
    });

    nodes.forEach(node => {
      if (node.Ancestor !== node.Descendant) {
        const parent = nodeMap.get(node.Ancestor);
        if (parent) {
          parent.Children.push(node);
        }
      }
    });

    // Order children by position
    nodeMap.forEach(node => {
      if (node.Children.length > 1) {
        node.Children.sort((a: any, b: any) => a.Position - b.Position);
      }
    });

    return nodeMap;
  }

  /**
  * Fetches the entire module tree structure via fetching and building the entire tree.
  * 
  * @param req - The express request object.
  * @param res - The express response object.
  */
  async getModuleTree(req: Request, res: Response) {
    const { moduleId } = req.params;
  
    if (!moduleId) {
      return res.status(400).json({ message: "Module ID" });
    }
    
    
    
    try {
      const connection = await getDbConnection();

      const [moduleRows]: any[] = await connection.execute(
        `SELECT WorkspaceID FROM module_Modules WHERE ModuleID = ?`,
        [moduleId]
      );
      
      if (!moduleRows.length) {
        throw new Error('Module not found');
      }
      
      const workspaceId = moduleRows[0].WorkspaceID;
      const serializedKey = serializeTuple([moduleId, workspaceId]);
      const existingTreeData = Server.getInstance().socketServer.workspaceModulesBuffer.get(serializedKey);

      if (existingTreeData) { // Return data from buffer
        res.status(200).json({
          WorkspaceID: workspaceId,
          retrievalSource: 'buffer',
          tree: existingTreeData
        });
      } else { // Return data from db
        const [rows]: any[] = await connection.execute(
          `SELECT 
            mc.*, 
            mn.Title, 
            mn.Content
          FROM 
            module_ModuleClosureTable mc
          JOIN 
            module_ModuleNodes mn 
          ON 
            mc.Descendant = mn.ModuleNodeID
          WHERE 
            mc.ModuleID = ?`,
          [moduleId]
        );
  
        const nodeMap = this.buildFullTree(rows);
        const tree = nodeMap.get(moduleId);
  
        if (!tree) throw new Error("Module Tree does not exist.")
  
        await connection.end();
  
        res.status(200).json({
          WorkspaceID: workspaceId,
          retrievalSource: 'database',
          tree
        });  
      }

    } catch (error) {
      console.error('Error fetching subtree:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
  * Fetches the subtree via fetching and building the entire tree first, 
  * and then returning the subtree of the specified part. This is faster in the
  * general case compared to the latter recursive version of the function, so this 
  * is the default function that is used.
  * 
  * @param req - The express request object.
  * @param res - The express response object.
  */
  async getSubtree(req: Request, res: Response) {
    const { moduleId, moduleNodeId } = req.params;
  
    if (!moduleId || !moduleNodeId) {
      return res.status(400).json({ message: "Module ID and Node ID are required" });
    }
  
    try {
      const connection = await getDbConnection();
      const [rows]: any[] = await connection.execute(
        `SELECT * FROM module_ModuleClosureTable WHERE ModuleID = ?`,
        [moduleId]
      );
      
      console.log("Rows: ", rows);

      const nodeMap = this.buildFullTree(rows);
      const subtreeRoot = nodeMap.get(moduleNodeId);
      const subtree = subtreeRoot || { message: "Node ID not found in the tree" };
  
      await connection.end();
  
      res.status(200).json(subtree);
    } catch (error) {
      console.error('Error fetching subtree:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
  /**
  * Recursively fetches the children of a given module node from the module closure table.
  * This function traverses all descendants of a specified parent node, building a hierarchical tree structure.
  * 
  * @param connection - The database connection object.
  * @param moduleId - The unique identifier for the module.
  * @param parentId - The unique identifier of the parent node from which to fetch descendants.
  * @returns An array of child nodes, each augmented with a 'children' property that holds its own descendants.
  */
  async fetchChildren(connection: any, moduleId: string, parentId: string) {
    // Fetch all descendants of the parent node
    const children = await connection.execute(
      `SELECT * FROM module_ModuleClosureTable
        WHERE ModuleID = ? AND Ancestor = ? AND Ancestor != Descendant
        ORDER BY Position`,
      [moduleId, parentId]
    );
  
    console.log("Children:", children);
  
    // Only make recursive calls if there are further descendants
    if (children[0].length > 0) {
      // Iterate through each child to construct the tree recursively
      for (const child of children[0]) {
        console.log("Traversing: ", child.Descendant);
        child.Children = await this.fetchChildren(connection, moduleId, child.Descendant);
      }
    } else {
      console.log("Terminate")
      return [];  // No further descendants, terminate the recursion
    }
      
    return children[0];
  }
  
  /**
  * Fetches the tree or subtree starting from a specific node recursively.
  * This function is very situational is usage as it is slower than the former 
  * function in the general case, but it's kept as it may be faster on some scenarios. 
  * 
  * @param req - The express request object.
  * @param res - The express response object.
  */
  async getSubtreeRecursively(req: Request, res: Response) {
    const { moduleId, moduleNodeId } = req.params;
  
    if (!moduleId || !moduleNodeId) {
      return res.status(400).json({ message: "Module ID and Node ID are required" });
    }
  
    try {
      const connection = await getDbConnection();
  
      // Fetch the root node information if needed
      const rootNode: any = await connection.execute(
        `SELECT * FROM module_ModuleClosureTable
         WHERE ModuleID = ? AND Descendant = ?`,
        [moduleId, moduleNodeId]
      );
  
      // Recursively fetch all children
      const tree = rootNode[0][0];
      console.log("Tree: ", tree);
      tree.Children = await this.fetchChildren(connection, moduleId, moduleNodeId);
  
      await connection.end();
  
      res.status(200).json(tree);
    } catch (error) {
      console.error('Error fetching subtree:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
  * Updates the content of a module node.
  * 
  * @param req The request object, expected to contain the module node ID and new content.
  * @param res The response object.
  */ 
  async updateModuleNodeContent(req: Request, res: Response) {
    if (req.method !== 'PATCH') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { moduleNodeId, content } = req.body;
    if (!moduleNodeId || !content) {
      return res.status(400).json({ message: 'Module Node ID and content are required' });
    }

    try {
      const connection = await getDbConnection();
      
      // Update content in the module node
      await connection.execute(
        'UPDATE module_ModuleNodes SET Content = ? WHERE ModuleNodeID = ?',
        [content, moduleNodeId]
      );

      await connection.end();
      return res.status(200).json({ message: 'Module node content updated successfully' });
    } catch (error) {
      console.error('Error updating module node content:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
  * Updates the content of a module node.
  * Meant for internal server use and not exposed to the user API routes.
  * 
  * @param moduleNodeId The ID of the module node to update.
  * @param content The new content for the module node.
  */
  async updateModuleNodeContentCallback(moduleNodeId: string, content: string) {
    try {
      const connection = await getDbConnection();
      
      // Update content in the module node
      await connection.execute(
        'UPDATE module_ModuleNodes SET Content = ? WHERE ModuleNodeID = ?',
        [content, moduleNodeId]
      );

      await connection.end();
      return { message: 'Module node content updated successfully' };
    } catch (error) {
      console.error('Error updating module node content:', error);
      return { message: 'Internal Server Error' };
    }
  }

  /**
  * Updates the title of a module node.
  * 
  * @param req The request object, expected to contain the module node ID and new title.
  * @param res The response object.
  */ 
  async updateModuleNodeTitle(req: Request, res: Response) {
    if (req.method !== 'PATCH') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { moduleNodeId, title } = req.body;
    console.log("Module data", moduleNodeId, title);

    if (!moduleNodeId || !title) {
      return res.status(400).json({ message: 'Module Node ID and title are required' });
    }

    try {
      const connection = await getDbConnection();
      
      // Update title in the module node
      await connection.execute(
        'UPDATE module_ModuleNodes SET Title = ? WHERE ModuleNodeID = ?',
        [title, moduleNodeId]
      );

      await connection.end();
      return res.status(200).json({ message: 'Module node title updated successfully' });
    } catch (error) {
      console.error('Error updating module node title:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
  * Updates the title of a module node.
  * Meant for internal server use and not exposed to the user API routes.
  * 
  * @param moduleNodeId The ID of the module node to update.
  * @param title The new title for the module node.
  */
  async updateModuleNodeTitleCallback(moduleNodeId: string, title: string) {
    try {
      const connection = await getDbConnection();
      
      // Update title in the module node
      await connection.execute(
        'UPDATE module_ModuleNodes SET Title = ? WHERE ModuleNodeID = ?',
        [title, moduleNodeId]
      );

      await connection.end();
      return { message: 'Module node title updated successfully' };
    } catch (error) {
      console.error('Error updating module node title:', error);
      return { message: 'Internal Server Error' };
    }
  }

  /**
   * Deletes a module node and updates positions of other nodes.
   *
   * @param req The request object, expected to contain the module node ID.
   * @param res The response object.
   */
  async deleteModuleNode(req: Request, res: Response) {
    if (req.method !== 'DELETE') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { moduleNodeId } = req.params;
    if (!moduleNodeId) {
      return res.status(400).json({ message: 'Module Node ID is required' });
    }

    try {
      const connection = await getDbConnection();

      // Step 1: Get the node to delete, including its Position and Depth
      const [nodeRows]: any[] = await connection.execute(
          'SELECT Position, Depth, ModuleID FROM module_ModuleClosureTable WHERE Descendant = ?',
          [moduleNodeId]
      );

      if (nodeRows.length === 0) {
        return res.status(404).json({ message: 'Module node not found' });
      }

      const { Position: deletedNodePosition, Depth: deletedNodeDepth, ModuleID: moduleId } = nodeRows[0];

      // Step 2: Update positions of nodes with the same Depth and higher Position
      await connection.execute(
          'UPDATE module_ModuleClosureTable SET Position = Position - 1 WHERE ModuleID = ? AND Depth = ? AND Position > ?',
          [moduleId, deletedNodeDepth, deletedNodePosition]
      );

      // Step 3: Delete the module node
      await connection.execute(
          'DELETE FROM module_ModuleClosureTable WHERE Descendant = ?',
          [moduleNodeId]
      );

      await connection.end();
      return res.status(204).end(); // No content, successful deletion
    } catch (error) {
      console.error('Error deleting module node:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
  * Deletes a module node.
  * Meant for internal server use and not exposed to the user API routes.
  * 
  * @param moduleNodeId The ID of the module node to delete.
  */
  async deleteModuleNodeCallback(moduleNodeId: string) {
    try {
      const connection = await getDbConnection();
      
      // Delete the module node
      await connection.execute(
        'DELETE FROM module_ModuleNodes WHERE ModuleNodeID = ?',
        [moduleNodeId]
      );

      await connection.end();
      return { message: 'Module node deleted successfully' };
    } catch (error) {
      console.error('Error deleting module node:', error);
      return { message: 'Internal Server Error' };
    }
  }
}

export default new ModuleController();