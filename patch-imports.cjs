const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'import { liveQueue, patientRegistry, users, appointments, settings, whatsappMessages, whatsappTemplates } from "./src/db/schema.js";',
  'import { liveQueue, patientRegistry, users, appointments, settings, whatsappMessages, whatsappTemplates, delhiveryOrders } from "./src/db/schema.js";'
);

code = code.replace(/const { delhiveryOrders } = require\('\.\/src\/db\/schema\.js'\);/g, '');

fs.writeFileSync('server.ts', code);
