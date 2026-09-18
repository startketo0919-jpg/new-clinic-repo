const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  'waAutoFollowUp: boolean;',
  'waAutoFollowUp: boolean;\n    smtpHost?: string;\n    smtpPort?: string;\n    smtpUser?: string;\n    smtpPass?: string;'
);

fs.writeFileSync('src/types.ts', code);
