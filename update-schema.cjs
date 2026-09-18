const fs = require('fs');
let schema = fs.readFileSync('src/db/schema.ts', 'utf8');

schema = schema.replace(
  'emailAutoCheckIn: boolean("email_auto_check_in").default(true),',
  `emailAutoCheckIn: boolean("email_auto_check_in").default(true),
  delhiveryApiKey: text("delhivery_api_key").default(""),
  delhiveryWarehouses: text("delhivery_warehouses").default("[]"),`
);

schema += `
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
`;

fs.writeFileSync('src/db/schema.ts', schema);
