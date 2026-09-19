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
      // Explicit Hostinger MySQL configuration (ignoring legacy SQL_* Postgres vars)
      const host = process.env.MYSQL_HOST || 'srv1873.hstgr.io';
      const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
      const user = process.env.MYSQL_USER || 'u670657683_clinic_user';
      const password = process.env.MYSQL_PASSWORD || 'Suyash@0919';
      const database = process.env.MYSQL_DATABASE || 'u670657683_clinic_app';

      console.log(`[DB] Initializing MySQL pool for ${user}@${host}:${port}/${database}`);

      global._mysqlPool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
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
