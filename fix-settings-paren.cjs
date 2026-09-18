const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
code = code.replace(/updateSettings\(\{ delhiveryWarehouses: JSON\.stringify\(warehouses\) \}\)\);/g, 'updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });');
fs.writeFileSync('src/pages/SettingsPage.tsx', code);
