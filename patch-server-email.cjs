const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /else if \(type === 'UPDATE_USER_PASSWORD'\) \{\s*await db\.update\(users\)\.set\(\{ passwordHash: payload\.newPassword \}\)\.where\(eq\(users\.username, payload\.username\)\);\s*\}/;

const replacement = `else if (type === 'UPDATE_USER_PASSWORD') {
        await db.update(users).set({ passwordHash: payload.newPassword }).where(eq(users.username, payload.username));
      }
      else if (type === 'UPDATE_USER_EMAIL') {
        await db.update(users).set({ email: payload.email }).where(eq(users.id, payload.id));
      }`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
