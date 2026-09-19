import { pool } from './index.js';
import { hashPassword } from './auth-utils.js';

export async function initDb() {
  console.log("Initializing MySQL database tables if not exist...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS patient_registry (
      clinic_id VARCHAR(50) PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      age INT NOT NULL,
      gender VARCHAR(20) NOT NULL,
      first_visit TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_visited TIMESTAMP NULL,
      follow_up_date TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS live_queue (
      id VARCHAR(191) PRIMARY KEY,
      clinic_id VARCHAR(50) NOT NULL,
      token VARCHAR(50) NOT NULL,
      full_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      age INT NOT NULL,
      gender VARCHAR(20) NOT NULL,
      priority VARCHAR(50) NOT NULL,
      visit_type VARCHAR(50) NOT NULL,
      shift_preference VARCHAR(50) DEFAULT 'Morning',
      status VARCHAR(50) NOT NULL,
      check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      wait_elapsed INT DEFAULT 0,
      completed_time TIMESTAMP NULL,
      sort_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(191) PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL,
      email TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS appointments (
      id VARCHAR(191) PRIMARY KEY,
      clinic_id VARCHAR(50),
      full_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      age INT NOT NULL,
      gender VARCHAR(20) NOT NULL,
      visit_type VARCHAR(50) NOT NULL,
      shift_preference VARCHAR(50) DEFAULT 'Morning',
      date VARCHAR(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(50) PRIMARY KEY,
      whatsapp_api_key TEXT,
      whatsapp_phone_id VARCHAR(100) DEFAULT '',
      current_patient_id VARCHAR(100),
      next_sequence INT DEFAULT 1,
      wa_auto_register_same_day BOOLEAN DEFAULT TRUE,
      wa_auto_register_future BOOLEAN DEFAULT TRUE,
      wa_auto_queue_alert BOOLEAN DEFAULT TRUE,
      wa_auto_follow_up BOOLEAN DEFAULT TRUE,
      smtp_host VARCHAR(255) DEFAULT '',
      smtp_port VARCHAR(20) DEFAULT '',
      smtp_user VARCHAR(255) DEFAULT '',
      smtp_pass VARCHAR(255) DEFAULT '',
      email_auto_new_pid BOOLEAN DEFAULT TRUE,
      email_auto_appt_confirmed BOOLEAN DEFAULT TRUE,
      email_auto_next_in_queue BOOLEAN DEFAULT TRUE,
      email_auto_follow_up BOOLEAN DEFAULT TRUE,
      email_auto_check_in BOOLEAN DEFAULT TRUE,
      delhivery_api_key VARCHAR(255) DEFAULT '',
      delhivery_warehouses TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id VARCHAR(191) PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      direction VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'sent',
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id VARCHAR(191) PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_event VARCHAR(50) NOT NULL,
      language_code VARCHAR(10) NOT NULL DEFAULT 'en',
      variables TEXT,
      is_active BOOLEAN DEFAULT TRUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS delhivery_orders (
      id VARCHAR(191) PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      awb VARCHAR(50),
      warehouse VARCHAR(255) NOT NULL,
      consignee_name VARCHAR(255) NOT NULL,
      consignee_phone VARCHAR(20) NOT NULL,
      consignee_address TEXT NOT NULL,
      consignee_pincode VARCHAR(10) NOT NULL,
      weight INT NOT NULL,
      length INT NOT NULL,
      width INT NOT NULL,
      height INT NOT NULL,
      payment_mode VARCHAR(20) NOT NULL,
      items TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'Created',
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS patient_shipments (
      id VARCHAR(191) PRIMARY KEY,
      patient_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      address TEXT NOT NULL,
      pincode VARCHAR(10) NOT NULL,
      notes TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (err) {
      console.error("Error creating MySQL table:", err);
    }
  }

  // Ensure default settings row exists
  try {
    await pool.query(`
      INSERT IGNORE INTO settings (id, next_sequence) 
      VALUES ('default', 1);
    `);
  } catch (err) {
    console.error("Error creating default settings:", err);
  }

  // Ensure default superadmin exists with hashed password and clean legacy users
  try {
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'Suyash@924219762788';
    const hashed = hashPassword(superAdminPassword);

    // Remove legacy users (admin, etc.) to ensure fresh start
    await pool.query(`DELETE FROM users WHERE username = 'admin' OR username != 'suyash';`);

    // Ensure superadmin 'suyash' is present with hashed password
    await pool.query(`
      INSERT INTO users (id, username, password_hash, role, email) 
      VALUES ('1', 'suyash', ?, 'admin', 'skgservicesin@gmail.com')
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', email = 'skgservicesin@gmail.com';
    `, [hashed]);

    console.log("Superadmin 'suyash' configured successfully with hashed password.");
  } catch (err) {
    console.error("Error creating default superadmin user:", err);
  }

  console.log("MySQL Database initialized successfully!");
}
