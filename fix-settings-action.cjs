const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

code = code.replace(/dispatchAction\('UPDATE_SETTINGS', /g, 'updateSettings(');

fs.writeFileSync('src/pages/SettingsPage.tsx', code);
