const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
code = code.replace(/JSON\.stringify\(warehouses \}\)\);/g, 'JSON.stringify(warehouses) });');
fs.writeFileSync('src/pages/SettingsPage.tsx', code);
