import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function getDbConnection() {
  const connection = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
  });
  return connection;
}
