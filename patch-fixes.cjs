const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Fix dimensions in payload
const regexPayload = /weight: weight,\s*length: length,\s*width: width,\s*height: height,/;
const replacePayload = `weight: weight,
            shipment_length: length,
            shipment_width: width,
            shipment_height: height,`;
code = code.replace(regexPayload, replacePayload);

// Fix DB insert unique constraint (id should be awb, not orderId)
const regexDb = /await db\.insert\(delhiveryOrders\)\.values\(\{([\s\S]*?)id: String\(orderId\),([\s\S]*?)orderId: String\(orderId\),/;
const replaceDb = `await db.insert(delhiveryOrders).values({$1id: awb || ('AWB' + Date.now()),$2orderId: String(orderId),`;
code = code.replace(regexDb, replaceDb);

fs.writeFileSync('server.ts', code);
