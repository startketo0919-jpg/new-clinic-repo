const pg = require('pg');
const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});
pool.query("SELECT id, content FROM whatsapp_messages WHERE phone = 'SYSTEM' ORDER BY timestamp DESC", (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
