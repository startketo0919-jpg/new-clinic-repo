const sqlite3 = require('better-sqlite3');
const db = sqlite3('sqlite.db');
const row = db.prepare('SELECT delhivery_api_key FROM settings WHERE id = ?').get('default');
console.log('Token from DB:', row ? row.delhivery_api_key : 'null');
