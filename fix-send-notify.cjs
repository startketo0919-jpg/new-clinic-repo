const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /await db\.insert\(whatsappMessages\)\.values\(newMsg\);\n      res\.json\(newMsg\);/g,
  `await db.insert(whatsappMessages).values(newMsg);
      notifyClients();
      res.json(newMsg);`
);

fs.writeFileSync('server.ts', code);
