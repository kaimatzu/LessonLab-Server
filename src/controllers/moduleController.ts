import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';

class ModuleController {

  constructor() {
    this.createModule = this.createModule.bind(this);
    this.insertChildToModuleNode = this.insertChildToModuleNode.bind(this);
    this.getSubtree = this.getSubtree.bind(this);
    this.getSubtreeRecursively = this.getSubtreeRecursively.bind(this);
  }

  /**
  * Creates a new module tree with a single module root node. Each module root node acts as a separate module.
  * 
  * @param req The request object, expected to contain the pageId, new title, and the lessonId.
  * @param res The response object.
  */ 
  async createModule(req: Request, res: Response) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Module name is required' });
    }
  
    try {
      const connection = await getDbConnection();
      const moduleId = uuidv4();
  
      // Create the new module
      await connection.execute(
        'INSERT INTO module_Modules (module_id, name, description) VALUES (?, ?, ?)',
        [moduleId, name, description]
      );
  
      const moduleNodeID = uuidv4();
      // Optionally create a root module node or initial structure
      await connection.execute(
        'INSERT INTO module_ModuleNodes (modulenode_id, title, content) VALUES (?, ?, ?)',
        [moduleNodeID, '', '']
      );
      await connection.execute(
        'INSERT INTO module_ModuleClosureTable (module_id, ancestor, descendant, depth, position) VALUES (?, ?, ?, 0, 0)',
        [moduleId, moduleNodeID, moduleNodeID]
      );
  
      await connection.end();
      return res.status(201).json({ message: 'Module created successfully', moduleId: moduleId, moduleNodeID: moduleNodeID });
    } catch ( error ) {
      console.error('Error creating module:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
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
        'SELECT COUNT(*) AS count FROM module_Modules WHERE module_id = ?',
        [moduleId]
      );
      const [parentNodeExists]: any = await connection.execute(
        'SELECT COUNT(*) AS count FROM module_ModuleNodes WHERE modulenode_id = ?',
        [parentNodeId]
      );
  
      if (moduleExists[0].count === 0 || parentNodeExists[0].count === 0) {
        return res.status(404).json({ message: 'Module or Parent Node does not exist' });
      }
  
      const moduleNodeID = uuidv4();
  
      // Insert new module node as a child
      await connection.execute(
        'INSERT INTO module_ModuleNodes (modulenode_id, title, content) VALUES (?, ?, ?)',
        [moduleNodeID, title, content]
      );
  
      // Calculate the new position as the count of current siblings
      const [positionData]: any = await connection.execute(
        `SELECT COUNT(*) AS siblingCount FROM module_ModuleClosureTable 
        WHERE ancestor = ? AND depth = (SELECT depth + 1 FROM module_ModuleClosureTable WHERE descendant = ? AND module_id = ?) 
        AND module_id = ?`,
        [parentNodeId, parentNodeId, moduleId, moduleId]
      );

      const newPosition = positionData[0].siblingCount;

  
      // First, fetch the depth separately
      const [depthResult]: any = await connection.execute(
        `SELECT depth FROM module_ModuleClosureTable WHERE descendant = ? AND module_id = ?`,
        [parentNodeId, moduleId]
      );

      const newDepth = depthResult[0].depth + 1;

      // Now perform the insert
      await connection.execute(
        `INSERT INTO module_ModuleClosureTable (module_id, ancestor, descendant, depth, position)
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
  * Builds a hierarchical tree from a flat array of node relationships.
  * @param nodes - Flat array of nodes from the database.
  */
  buildFullTree(nodes: any[]) {
    const nodeMap = new Map<string, any>();
    nodes.forEach(node => {
      node.children = [];
      nodeMap.set(node.descendant, node);
    });

    nodes.forEach(node => {
      if (node.ancestor !== node.descendant) {
        const parent = nodeMap.get(node.ancestor);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    // Order children by position
    nodeMap.forEach(node => {
      if (node.children.length > 1) {
        node.children.sort((a: any, b: any) => a.position - b.position);
      }
    });

    return nodeMap;
  }

  /**
  * Fetches the tree or subtree via fetching and building the entire tree first, 
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
        `SELECT * FROM module_ModuleClosureTable WHERE module_id = ?`,
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
        WHERE module_id = ? AND ancestor = ? AND ancestor != descendant
        ORDER BY position`,
      [moduleId, parentId]
    );
  
    console.log("Children:", children);
  
    // Only make recursive calls if there are further descendants
    if (children[0].length > 0) {
      // Iterate through each child to construct the tree recursively
      for (const child of children[0]) {
        console.log("Traversing: ", child.descendant);
        child.children = await this.fetchChildren(connection, moduleId, child.descendant);
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
         WHERE module_id = ? AND descendant = ?`,
        [moduleId, moduleNodeId]
      );
  
      // Recursively fetch all children
      const tree = rootNode[0][0];
      console.log("Tree: ", tree);
      tree.children = await this.fetchChildren(connection, moduleId, moduleNodeId);
  
      await connection.end();
  
      res.status(200).json(tree);
    } catch (error) {
      console.error('Error fetching subtree:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

}

export default new ModuleController();