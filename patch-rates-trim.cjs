const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "'Authorization': `Token ${s.delhiveryApiKey}`",
  "'Authorization': `Token ${s.delhiveryApiKey.trim()}`"
);

// remove duplicate console log
code = code.replace("console.log('Using token:', s.delhiveryApiKey);\n      console.log('Using token:', s.delhiveryApiKey);", "console.log('Using token:', s.delhiveryApiKey);");

fs.writeFileSync('server.ts', code);
