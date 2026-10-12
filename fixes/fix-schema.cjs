const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

// I will fix the duplicate email keys that my regex caused
code = code.replace(/email: varchar\("email", \{ length: 255 \}\),\n  email: varchar\("email", \{ length: 255 \}\),\n  email: varchar\("email", \{ length: 255 \}\),/g, 'email: varchar("email", { length: 255 }),');
code = code.replace(/email: varchar\("email", \{ length: 255 \}\),\n  email: varchar\("email", \{ length: 255 \}\),/g, 'email: varchar("email", { length: 255 }),');

fs.writeFileSync('src/db/schema.ts', code);
