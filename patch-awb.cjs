const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

code = code.replace(
  "const awb = data.packages?.[0]?.waybill || data.upload_wbn || data.waybill || data.success ? ('AWB' + Date.now()) : null;",
  "const awb = data.packages?.[0]?.waybill || data.upload_wbn || data.waybill || (data.success ? ('AWB' + Date.now()) : null);"
);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
