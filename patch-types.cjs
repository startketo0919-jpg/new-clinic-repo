const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  'emailAutoCheckIn?: boolean;',
  `emailAutoCheckIn?: boolean;
    delhiveryApiKey?: string;
    delhiveryWarehouses?: string;`
);

fs.writeFileSync('src/types.ts', code);
