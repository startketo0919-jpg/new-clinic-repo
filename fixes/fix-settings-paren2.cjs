const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
code = code.replace(/warehouses\) \}\)\);/g, 'warehouses) });');
fs.writeFileSync('src/pages/SettingsPage.tsx', code);
