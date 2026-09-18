const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

pool.query("DELETE FROM whatsapp_messages WHERE id = 'ABGGFlA5Fpa'", () => { pool.end(); });
