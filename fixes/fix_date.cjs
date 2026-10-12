const fs = require('fs');
let code = fs.readFileSync('src/components/UpcomingAppointments.tsx', 'utf8');

const replacement = `const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');`;

code = code.replace(/const todayStr = new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\];/, replacement);

fs.writeFileSync('src/components/UpcomingAppointments.tsx', code);
