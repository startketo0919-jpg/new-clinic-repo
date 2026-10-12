const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/res\.status\(200\)\.send\(challenge\);/, "res.status(200).type('text/plain').send(challenge);");

fs.writeFileSync('server.ts', code);
