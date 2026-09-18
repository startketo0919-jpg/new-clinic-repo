const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/Token \$\{s\.delhiveryApiKey\}/g, "Token ${s.delhiveryApiKey.trim()}");
fs.writeFileSync('server.ts', code);
