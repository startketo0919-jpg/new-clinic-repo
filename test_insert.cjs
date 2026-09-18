const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

async function run() {
  try {
    const res = await pool.query(
      "INSERT INTO whatsapp_messages (id, phone, direction, content, status, timestamp) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *",
      ['ABGGFlA5Fpa', '16315551181', 'inbound', 'this is a text message', 'received']
    );
    console.log("Success:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  }
  pool.end();
}
run();
