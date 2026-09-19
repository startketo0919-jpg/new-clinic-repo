import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

export const createPool = () => {
  if (!global._mysqlPool) {
    // Only use DATABASE_URL if it explicitly begins with mysql://
    const connectionString = process.env.DATABASE_URL;
    if (connectionString && connectionString.startsWith('mysql://')) {
      global._mysqlPool = mysql.createPool({
        uri: connectionString,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    } else {
      // Read configuration exclusively from environment variables
      const host = process.env.MYSQL_HOST;
      const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
      const user = process.env.MYSQL_USER;
      const password = process.env.MYSQL_PASSWORD;
      const database = process.env.MYSQL_DATABASE;

      if (!host || !user || !password || !database) {
        console.warn(`[DB] Warning: Missing MySQL configuration! Please define MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE in environment variables.`);
      }

      console.log(`[DB] Initializing MySQL pool for ${user || '(not set)'}@${host || '(not set)'}:${port}/${database || '(not set)'}`);

      global._mysqlPool = mysql.createPool({
        host: host || 'localhost',
        port,
        user: user || '',
        password: password || '',
        database: database || '',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 20000,
      });
    }
  }
  return global._mysqlPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema, mode: 'default' });
