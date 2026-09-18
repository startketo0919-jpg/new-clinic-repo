import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "const adminUser = { id: \"1\", username: 'admin', passwordHash: 'Suyash@0919', role: 'admin' };",
  "const adminUser = { id: \"1\", username: 'admin', passwordHash: 'Suyash@0919', role: 'admin', email: 'skgservicesin@gmail.com' };"
);
fs.writeFileSync('server.ts', code);
