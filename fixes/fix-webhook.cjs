const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /require\('fs'\)\.appendFileSync\('webhook\.log', JSON\.stringify\(body\) \+ '\\n'\);\n/g,
  ''
);

fs.writeFileSync('server.ts', code);
