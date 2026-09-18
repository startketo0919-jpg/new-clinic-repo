import { pgTable, text, timestamp, integer, boolean, serial, varchar } from "drizzle-orm/pg-core";

export const patientRegistry = pgTable("patient_registry", {
  clinicId: varchar("clinic_id", { length: 20 }).primaryKey(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  firstVisit: timestamp("first_visit").notNull().defaultNow(),
  lastVisited: timestamp("last_visited"),
  followUpDate: timestamp("follow_up_date"),
});

export const liveQueue = pgTable("live_queue", {
  id: text("id").primaryKey(),
  clinicId: varchar("clinic_id", { length: 20 }).notNull(),
  token: varchar("token", { length: 20 }).notNull(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  priority: varchar("priority", { length: 50 }).notNull(),
  visitType: varchar("visit_type", { length: 50 }).notNull(),
  shiftPreference: varchar("shift_preference", { length: 50 }).default("Morning"),
  status: varchar("status", { length: 50 }).notNull(),
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  waitElapsed: integer("wait_elapsed").default(0),
  completedTime: timestamp("completed_time"),
  sortOrder: integer("sort_order").default(0),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  email: text("email"),
});

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  clinicId: varchar("clinic_id", { length: 20 }),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  visitType: varchar("visit_type", { length: 50 }).notNull(),
  shiftPreference: varchar("shift_preference", { length: 50 }).default("Morning"),
  date: varchar("date", { length: 20 }).notNull(),
});

export const settings = pgTable("settings", {
  id: varchar("id", { length: 20 }).primaryKey().default("default"),
  whatsappApiKey: text("whatsapp_api_key").default(""),
  whatsappPhoneId: text("whatsapp_phone_id").default(""),
  currentPatientId: text("current_patient_id"),
  nextSequence: integer("next_sequence").default(1),
  waAutoRegisterSameDay: boolean("wa_auto_register_same_day").default(true),
  waAutoRegisterFuture: boolean("wa_auto_register_future").default(true),
  waAutoQueueAlert: boolean("wa_auto_queue_alert").default(true),
  waAutoFollowUp: boolean("wa_auto_follow_up").default(true),
  smtpHost: text("smtp_host").default(""),
  smtpPort: text("smtp_port").default(""),
  smtpUser: text("smtp_user").default(""),
  smtpPass: text("smtp_pass").default(""),
  emailAutoNewPid: boolean("email_auto_new_pid").default(true),
  emailAutoApptConfirmed: boolean("email_auto_appt_confirmed").default(true),
  emailAutoNextInQueue: boolean("email_auto_next_in_queue").default(true),
  emailAutoFollowUp: boolean("email_auto_follow_up").default(true),
  emailAutoCheckIn: boolean("email_auto_check_in").default(true),
  delhiveryApiKey: text("delhivery_api_key").default(""),
  delhiveryWarehouses: text("delhivery_warehouses").default("[]"),
});


export const whatsappMessages = pgTable("whatsapp_messages", {
  id: text("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  direction: varchar("direction", { length: 20 }).notNull(), // 'inbound' | 'outbound'
  content: text("content").notNull(),
  status: varchar("status", { length: 20 }).default('sent'), // sent, delivered, read, received
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  triggerEvent: varchar("trigger_event", { length: 50 }).notNull(),
  languageCode: varchar("language_code", { length: 10 }).notNull().default('en'),
  variables: text("variables"), // JSON string of mapped variables
  isActive: boolean("is_active").default(true),
});

export const delhiveryOrders = pgTable("delhivery_orders", {
  id: text("id").primaryKey(),
  orderId: varchar("order_id", { length: 50 }).notNull(),
  awb: varchar("awb", { length: 50 }),
  warehouse: varchar("warehouse", { length: 255 }).notNull(),
  consigneeName: varchar("consignee_name", { length: 255 }).notNull(),
  consigneePhone: varchar("consignee_phone", { length: 20 }).notNull(),
  consigneeAddress: text("consignee_address").notNull(),
  consigneePincode: varchar("consignee_pincode", { length: 10 }).notNull(),
  weight: integer("weight").notNull(),
  length: integer("length").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  paymentMode: varchar("payment_mode", { length: 20 }).notNull(),
  items: text("items").notNull(), // JSON string
  status: varchar("status", { length: 50 }).default("Created"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});
