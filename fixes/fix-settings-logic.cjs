const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

code = code.replace(/localSettings/g, 'state.settings');
code = code.replace(/handleUpdate\('([^']+)',\s*([^)]+)\)/g, 'updateSettings({ $1: $2 })');
code = code.replace(/handleSave\(\)/g, ''); // remove handleSave
code = code.replace(/; ;/g, ';'); // cleanup empty statements

fs.writeFileSync('src/pages/SettingsPage.tsx', code);
