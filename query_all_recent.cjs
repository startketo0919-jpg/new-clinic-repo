const pg = require('pg');
const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});
pool.query("SELECT id, phone, direction, content FROM whatsapp_messages ORDER BY timestamp DESC LIMIT 15", (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
