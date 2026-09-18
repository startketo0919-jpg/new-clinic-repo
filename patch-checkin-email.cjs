const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInForm.tsx', 'utf8');

code = code.replace(
  "const [phone, setPhone] = useState('');",
  "const [phone, setPhone] = useState('');\n  const [email, setEmail] = useState('');"
);

code = code.replace(
  "phone,",
  "phone,\n      email,"
);

const emailInput = `
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                placeholder="email@example.com"
              />
            </div>
`;

code = code.replace(
  /<input\n\s*type="tel"/,
  emailInput + '\n            <div>\n              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>\n              <input\n                type="tel"'
);

// We need to robustly replace the phone input
fs.writeFileSync('src/components/CheckInForm.tsx', code);
