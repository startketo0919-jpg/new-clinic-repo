const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

code = code.replace(
  /const generatedId = addAppointment\(\{/,
  'const generatedId = addAppointment({\n      email,'
);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
