const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInForm.tsx', 'utf8');

code = code.replace(
  /addPatient\(\{[\s\S]*?fullName,[\s\S]*?phone,/,
  `addPatient({
      email,
      fullName,
      phone,`
);

fs.writeFileSync('src/components/CheckInForm.tsx', code);
