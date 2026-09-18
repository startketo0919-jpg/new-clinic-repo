const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

code = code.replace(
  /nextSequence: integer\("next_sequence"\)\.default\(1\),/g,
  `nextSequence: integer("next_sequence").default(1),
  waAutoRegisterSameDay: boolean("wa_auto_register_same_day").default(true),
  waAutoRegisterFuture: boolean("wa_auto_register_future").default(true),
  waAutoQueueAlert: boolean("wa_auto_queue_alert").default(true),
  waAutoFollowUp: boolean("wa_auto_follow_up").default(true),`
);

code += `\n\nexport const whatsappMessages = pgTable("whatsapp_messages", {
  id: text("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  direction: varchar("direction", { length: 20 }).notNull(), // 'inbound' | 'outbound'
  content: text("content").notNull(),
  status: varchar("status", { length: 20 }).default('sent'), // sent, delivered, read, received
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});\n`;

fs.writeFileSync('src/db/schema.ts', code);
