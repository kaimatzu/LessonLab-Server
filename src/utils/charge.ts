import { Connection } from "mysql2/promise";
import Server from "../index";

export async function chargeUserByWorkspaceId(connection: Connection, content: string, workspaceId: string) {
  try {
    const [user]: any = await connection.execute(
      `SELECT UserID FROM Workspaces WHERE WorkspaceID = ?`,
      [workspaceId]
    );

    const userId = user[0].UserID;

    const [tokenRow]: any = await connection.execute(
      `SELECT Tokens FROM Users WHERE UserID = ?`,
      [userId]
    );

    const tokens = tokenRow[0].Tokens;

    const newToken = charge(content, tokens)

    await connection.execute(
      `UPDATE Users SET Tokens = ? WHERE UserID = ?`,
      [newToken, userId]
    )

    // Emit token update event
    Server.getInstance().socketServer.io.to(workspaceId).emit('token-update', newToken);

    return newToken;
  } catch (error) {
    console.error(error)
  }
}

export async function chargeUserByModuleId(connection: Connection, content: string, moduleId: string) {
  try {
    const [workspace]: any = await connection.execute(
      `SELECT WorkspaceID FROM module_Modules WHERE ModuleID = ?`,
      [moduleId]
    );

    const [user]: any = await connection.execute(
      `SELECT UserID FROM Workspaces WHERE WorkspaceID = ?`,
      [workspace[0].WorkspaceID]
    );

    const userId = user[0].UserID;

    const [tokenRow]: any = await connection.execute(
      `SELECT Tokens FROM Users WHERE UserID = ?`,
      [userId]
    );

    const tokens = tokenRow[0].Tokens;

    const newToken = charge(content, tokens)

    await connection.execute(
      `UPDATE Users SET Tokens = ? WHERE UserID = ?`,
      [newToken, userId]
    )

    // Emit token update event
    Server.getInstance().socketServer.io.to(workspace[0].WorkspaceID).emit('token-update', newToken);

    return newToken;
  } catch (error) {
    console.error(error)
  }
}

export function charge(content: string, tokens: number) {
  const tok = tokens - content.length
  if (tok < 0) return 0
  return tok
}