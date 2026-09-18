const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

code = code.replace(
  /body: JSON\.stringify\(\{ email \}\)/,
  'body: JSON.stringify({ email, fullName })'
);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
