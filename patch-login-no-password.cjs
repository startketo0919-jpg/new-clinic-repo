const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

code = code.replace(
  "const user = state.users.find(u => u.username === username && u.passwordHash === password);",
  "const user = state.users.find(u => u.username === username);"
);

code = code.replace(
  "setError('Incorrect username or password');",
  "setError('Username not found');"
);

// Remove the password input block from UI
const passwordInputRegex = /<div className="relative">\s*<Lock className="w-5 h-5 absolute left-3 top-3 text-slate-400" \/>\s*<input\s*type="password"\s*value=\{password\}\s*onChange=\{e => setPassword\(e\.target\.value\)\}\s*placeholder="Password"\s*className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"\s*required\s*\/>\s*<\/div>/;
code = code.replace(passwordInputRegex, "");

// Remove password reset in cancel button
code = code.replace(
  "setPassword(''); setUsername(''); setError('');",
  "setUsername(''); setError('');"
);

fs.writeFileSync('src/pages/Login.tsx', code);
