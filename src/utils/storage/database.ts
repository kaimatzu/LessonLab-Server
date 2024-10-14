import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs'; // Import the fs module to read the CA certificate

dotenv.config();

export async function getDbConnection() {
  try {
    const port = process.env.DBPORT ? parseInt(process.env.DBPORT, 10) : 3306;

    console.log('Connecting to MySQL...');

    // Read the CA certificate from the environment or a fixed path
    const ca = process.env.CA_CERT ? fs.readFileSync(process.env.CA_CERT) : undefined;

    const connection = await mysql.createConnection({
      host: process.env.HOST,
      port: port,
      user: process.env.DBUSER,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      ssl: {
        rejectUnauthorized: true, // Ensure that the server certificate is verified
        ca: ca // Include the CA certificate
      }
    });

    return connection;
  } catch (error) {
    console.error('Error creating DB connection:', error);
    throw new Error('DB connection error');
  }
}