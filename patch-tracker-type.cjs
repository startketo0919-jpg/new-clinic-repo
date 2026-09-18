const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');
code = code.replace(
  "body: JSON.stringify({ email: userEmail, fullName: '' })",
  "body: JSON.stringify({ email: userEmail, fullName: '', type: 'checkin' })"
);
fs.writeFileSync('src/pages/PatientTracker.tsx', code);
