const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /CareSync Clinic/g,
  'Krishna Homoeopathic Clinic'
);

fs.writeFileSync('server.ts', code);
