import { mysqlTable, text, timestamp, int, boolean, varchar } from "drizzle-orm/mysql-core";

export const patientRegistry = mysqlTable("patient_registry", {
  clinicId: varchar("clinic_id", { length: 50 }).primaryKey(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  age: int("age").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  firstVisit: timestamp("first_visit").notNull().defaultNow(),
  lastVisited: timestamp("last_visited"),
  followUpDate: timestamp("follow_up_date"),
});

export const liveQueue = mysqlTable("live_queue", {
  id: varchar("id", { length: 191 }).primaryKey(),
  clinicId: varchar("clinic_id", { length: 50 }).notNull(),
  token: varchar("token", { length: 50 }).notNull(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  age: int("age").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  priority: varchar("priority", { length: 50 }).notNull(),
  visitType: varchar("visit_type", { length: 50 }).notNull(),
  shiftPreference: varchar("shift_preference", { length: 50 }).default("Morning"),
  status: varchar("status", { length: 50 }).notNull(),
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  waitElapsed: int("wait_elapsed").default(0),
  completedTime: timestamp("completed_time"),
  sortOrder: int("sort_order").default(0),
});

export const users = mysqlTable("users", {
  id: varchar("id", { length: 191 }).primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  email: text("email"),
});

export const appointments = mysqlTable("appointments", {
  id: varchar("id", { length: 191 }).primaryKey(),
  clinicId: varchar("clinic_id", { length: 50 }),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  age: int("age").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  visitType: varchar("visit_type", { length: 50 }).notNull(),
  shiftPreference: varchar("shift_preference", { length: 50 }).default("Morning"),
  date: varchar("date", { length: 20 }).notNull(),
});

export const settings = mysqlTable("settings", {
  id: varchar("id", { length: 50 }).primaryKey().default("default"),
  whatsappApiKey: text("whatsapp_api_key"),
  whatsappPhoneId: text("whatsapp_phone_id"),
  currentPatientId: text("current_patient_id"),
  nextSequence: int("next_sequence").default(1),
  waAutoRegisterSameDay: boolean("wa_auto_register_same_day").default(true),
  waAutoRegisterFuture: boolean("wa_auto_register_future").default(true),
  waAutoQueueAlert: boolean("wa_auto_queue_alert").default(true),
  waAutoFollowUp: boolean("wa_auto_follow_up").default(true),
  smtpHost: text("smtp_host"),
  smtpPort: text("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  emailAutoNewPid: boolean("email_auto_new_pid").default(true),
  emailAutoApptConfirmed: boolean("email_auto_appt_confirmed").default(true),
  emailAutoNextInQueue: boolean("email_auto_next_in_queue").default(true),
  emailAutoFollowUp: boolean("email_auto_follow_up").default(true),
  emailAutoCheckIn: boolean("email_auto_check_in").default(true),
  delhiveryApiKey: text("delhivery_api_key"),
  delhiveryWarehouses: text("delhivery_warehouses"),
});

export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: varchar("id", { length: 191 }).primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  direction: varchar("direction", { length: 20 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 20 }).default('sent'),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const whatsappTemplates = mysqlTable("whatsapp_templates", {
  id: varchar("id", { length: 191 }).primaryKey(),
  name: text("name").notNull(),
  triggerEvent: varchar("trigger_event", { length: 50 }).notNull(),
  languageCode: varchar("language_code", { length: 10 }).notNull().default('en'),
  variables: text("variables"),
  isActive: boolean("is_active").default(true),
});

export const delhiveryOrders = mysqlTable("delhivery_orders", {
  id: varchar("id", { length: 191 }).primaryKey(),
  orderId: varchar("order_id", { length: 50 }).notNull(),
  awb: varchar("awb", { length: 50 }),
  warehouse: varchar("warehouse", { length: 255 }).notNull(),
  consigneeName: varchar("consignee_name", { length: 255 }).notNull(),
  consigneePhone: varchar("consignee_phone", { length: 20 }).notNull(),
  consigneeAddress: text("consignee_address").notNull(),
  consigneePincode: varchar("consignee_pincode", { length: 10 }).notNull(),
  weight: int("weight").notNull(),
  length: int("length").notNull(),
  width: int("width").notNull(),
  height: int("height").notNull(),
  paymentMode: varchar("payment_mode", { length: 20 }).notNull(),
  items: text("items").notNull(),
  status: varchar("status", { length: 50 }).default("Created"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const patientShipments = mysqlTable("patient_shipments", {
  id: varchar("id", { length: 191 }).primaryKey(),
  patientName: text("patient_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address").notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default("Pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});
