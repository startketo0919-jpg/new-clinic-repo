import fs from 'fs';
let code = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');

code = code.replace(
  "const [password, setPassword] = useState('');",
  "const [password, setPassword] = useState('');\n  const [email, setEmail] = useState('');"
);

code = code.replace(
  "addUser({ username, passwordHash: password, role });\n      setUsername('');\n      setPassword('');",
  "addUser({ username, passwordHash: password, role, email });\n      setUsername('');\n      setPassword('');\n      setEmail('');"
);

const emailField = `
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email (For OTP Login)</label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>`;

code = code.replace(
  "<div>\n              <label className=\"block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1\">Role</label>",
  emailField + "\n            <div>\n              <label className=\"block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1\">Role</label>"
);

code = code.replace(
  "<th className=\"py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider\">Role</th>",
  "<th className=\"py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider\">Email</th>\n                  <th className=\"py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider\">Role</th>"
);

code = code.replace(
  "<td className=\"py-3 px-4\">",
  "<td className=\"py-3 px-4 text-sm text-slate-600\">{u.email}</td>\n                    <td className=\"py-3 px-4\">"
);

fs.writeFileSync('src/components/UserManagement.tsx', code);
