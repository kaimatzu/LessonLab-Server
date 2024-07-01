import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function getDbConnection() {
  try {
    const port = process.env.DBPORT ? parseInt(process.env.DBPORT, 10) : 3306;

    console.log('Connecting to MySQL with the following details:');
    console.log(`Host: ${process.env.HOST}`);
    console.log(`Port: ${port}`);
    console.log(`User: ${process.env.DBUSER}`);
    console.log(`Password: ${process.env.PASSWORD}`);
    console.log(`Database: ${process.env.DATABASE}`);

    const connection = await mysql.createConnection({
      host: process.env.HOST,
      port: port,
      user: process.env.DBUSER,
      password: process.env.PASSWORD,
      database: process.env.DATABASE
    });
    return connection;
  } catch (error) {
    console.error('Error creating DB connection:', error);
    throw new Error('DB connection error');
  }
}