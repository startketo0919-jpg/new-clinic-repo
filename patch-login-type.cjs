const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');
code = code.replace(
  "body: JSON.stringify({ email: user.email, fullName: user.username })",
  "body: JSON.stringify({ email: user.email, fullName: user.username, type: 'login' })"
);
fs.writeFileSync('src/pages/Login.tsx', code);
