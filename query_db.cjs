const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT * FROM whatsapp_messages', (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
