import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

export const createPool = () => {
  if (!global._mysqlPool) {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString && connectionString.startsWith('mysql')) {
      global._mysqlPool = mysql.createPool({
        uri: connectionString,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    } else {
      global._mysqlPool = mysql.createPool({
        host: process.env.MYSQL_HOST || process.env.SQL_HOST || '127.0.0.1',
        port: parseInt(process.env.MYSQL_PORT || process.env.SQL_PORT || '3306', 10),
        user: process.env.MYSQL_USER || process.env.SQL_USER || 'u670657683_clinic_user',
        password: process.env.MYSQL_PASSWORD || process.env.SQL_PASSWORD || 'Suyash@0919',
        database: process.env.MYSQL_DATABASE || process.env.SQL_DB_NAME || 'u670657683_clinic_app',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 15000,
      });
    }
  }
  return global._mysqlPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema, mode: 'default' });
