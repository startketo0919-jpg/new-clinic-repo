const fs = require('fs');
let code = fs.readFileSync('src/components/PatientHistory.tsx', 'utf8');

code = code.replace(
  /<th className="px-6 py-4 font-semibold text-slate-700">Phone<\/th>/g,
  '<th className="px-6 py-4 font-semibold text-slate-700">Contact / Email</th>'
);

code = code.replace(
  /<td className="px-6 py-4 text-slate-600">\{p\.phone\}<\/td>/g,
  '<td className="px-6 py-4 text-slate-600"><div className="font-medium">{p.phone}</div>{p.email && <div className="text-xs text-slate-400 mt-1">{p.email}</div>}</td>'
);

fs.writeFileSync('src/components/PatientHistory.tsx', code);
