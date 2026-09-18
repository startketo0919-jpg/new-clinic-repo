const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "const awb = data.packages?.[0]?.waybill || (data.success ? ('AWB' + Date.now()) : null);",
  "const awb = data.packages?.[0]?.waybill || data.upload_wbn || data.waybill || (data.success ? ('AWB' + Date.now()) : null);"
);

fs.writeFileSync('server.ts', code);
