const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "const getRate = async (mode) => {",
  "console.log('Using token:', s.delhiveryApiKey);\n      const getRate = async (mode) => {"
);

fs.writeFileSync('server.ts', code);
