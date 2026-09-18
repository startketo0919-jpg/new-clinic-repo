import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /  \}\);\n                const \{ waybill \} = req\.body;[\s\S]*?app\.get\('\/api\/delhivery\/label\/:awb\.pdf'/;
code = code.replace(regex, "  });\n\n  app.get('/api/delhivery/label/:awb.pdf'");
fs.writeFileSync('server.ts', code);
