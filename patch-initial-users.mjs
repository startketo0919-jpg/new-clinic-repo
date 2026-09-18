import fs from 'fs';
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');
code = code.replace(
  "{ id: '1', username: 'admin', passwordHash: 'Suyash@0919', role: 'admin' }",
  "{ id: '1', username: 'admin', passwordHash: 'Suyash@0919', role: 'admin', email: 'skgservicesin@gmail.com' }"
);
fs.writeFileSync('src/context/ClinicContext.tsx', code);
