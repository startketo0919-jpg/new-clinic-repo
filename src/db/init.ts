import { pool } from './index.js';

export async function initDb() {
  console.log("Initializing database tables if not exist...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS patient_registry (
      clinic_id VARCHAR(20) PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      age INTEGER NOT NULL,
      gender VARCHAR(20) NOT NULL,
      first_visit TIMESTAMP NOT NULL DEFAULT NOW(),
      last_visited TIMESTAMP,
      follow_up_date TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS live_queue (
      id TEXT PRIMARY KEY,
      clinic_id VARCHAR(20) NOT NULL,
      token VARCHAR(20) NOT NULL,
      full_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      age INTEGER NOT NULL,
      gender VARCHAR(20) NOT NULL,
      priority VARCHAR(50) NOT NULL,
      visit_type VARCHAR(50) NOT NULL,
      shift_preference VARCHAR(50) DEFAULT 'Morning',
      status VARCHAR(50) NOT NULL,
      check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
      wait_elapsed INTEGER DEFAULT 0,
      completed_time TIMESTAMP,
      sort_order INTEGER DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL,
      email TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      clinic_id VARCHAR(20),
      full_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      age INTEGER NOT NULL,
      gender VARCHAR(20) NOT NULL,
      visit_type VARCHAR(50) NOT NULL,
      shift_preference VARCHAR(50) DEFAULT 'Morning',
      date VARCHAR(20) NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(20) PRIMARY KEY DEFAULT 'default',
      whatsapp_api_key TEXT DEFAULT '',
      whatsapp_phone_id TEXT DEFAULT '',
      current_patient_id TEXT,
      next_sequence INTEGER DEFAULT 1,
      wa_auto_register_same_day BOOLEAN DEFAULT TRUE,
      wa_auto_register_future BOOLEAN DEFAULT TRUE,
      wa_auto_queue_alert BOOLEAN DEFAULT TRUE,
      wa_auto_follow_up BOOLEAN DEFAULT TRUE,
      smtp_host TEXT DEFAULT '',
      smtp_port TEXT DEFAULT '',
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      email_auto_new_pid BOOLEAN DEFAULT TRUE,
      email_auto_appt_confirmed BOOLEAN DEFAULT TRUE,
      email_auto_next_in_queue BOOLEAN DEFAULT TRUE,
      email_auto_follow_up BOOLEAN DEFAULT TRUE,
      email_auto_check_in BOOLEAN DEFAULT TRUE,
      delhivery_api_key TEXT DEFAULT '',
      delhivery_warehouses TEXT DEFAULT '[]'
    );`,

    `CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      direction VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'sent',
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_event VARCHAR(50) NOT NULL,
      language_code VARCHAR(10) NOT NULL DEFAULT 'en',
      variables TEXT,
      is_active BOOLEAN DEFAULT TRUE
    );`,

    `CREATE TABLE IF NOT EXISTS delhivery_orders (
      id TEXT PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      awb VARCHAR(50),
      warehouse VARCHAR(255) NOT NULL,
      consignee_name VARCHAR(255) NOT NULL,
      consignee_phone VARCHAR(20) NOT NULL,
      consignee_address TEXT NOT NULL,
      consignee_pincode VARCHAR(10) NOT NULL,
      weight INTEGER NOT NULL,
      length INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      payment_mode VARCHAR(20) NOT NULL,
      items TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'Created',
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );`
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (err) {
      console.error("Error creating table:", err);
    }
  }

  // Ensure default settings row exists
  try {
    await pool.query(`
      INSERT INTO settings (id, next_sequence) 
      VALUES ('default', 1) 
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err) {
    console.error("Error creating default settings:", err);
  }

  // Ensure default admin user exists
  try {
    await pool.query(`
      INSERT INTO users (id, username, password_hash, role, email) 
      VALUES ('1', 'admin', 'Suyash@0919', 'admin', 'skgservicesin@gmail.com') 
      ON CONFLICT (username) DO NOTHING;
    `);
  } catch (err) {
    console.error("Error creating default admin user:", err);
  }

  console.log("Database initialized successfully!");
}
