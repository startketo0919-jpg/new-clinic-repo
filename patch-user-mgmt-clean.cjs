const fs = require('fs');
let code = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');

code = code.replace(
  '<th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</th>',
  ''
);

code = code.replace(
  '<td className="py-3 px-4 text-sm font-mono text-slate-500">{u.passwordHash}</td>',
  ''
);

fs.writeFileSync('src/components/UserManagement.tsx', code);
