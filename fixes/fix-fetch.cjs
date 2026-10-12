const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /appointments: data\.appointments \|\| \[\],/g,
  `appointments: data.appointments || [],\n          messages: data.messages || [],`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
