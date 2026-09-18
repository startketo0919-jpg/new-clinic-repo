const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInForm.tsx', 'utf8');

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
  /<div>\s*<label className="block text-sm font-medium text-slate-700 mb-1">Phone Number<\/label>\s*<input \s*type="tel"/,
  emailInput + '          <div>\n            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>\n            <input \n              type="tel"'
);

fs.writeFileSync('src/components/CheckInForm.tsx', code);
