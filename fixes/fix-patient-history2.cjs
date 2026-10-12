const fs = require('fs');
let code = fs.readFileSync('src/components/PatientHistory.tsx', 'utf8');

code = code.replace(
  '<th className="px-6 py-4 font-semibold text-slate-700">Contact Details</th>',
  '<th className="px-6 py-4 font-semibold text-slate-700">Contact Details</th>' // Ensure we have the right column. Wait, what is the column?
);

code = code.replace(
  /<p className="text-sm font-medium text-slate-700">\{patient\.phone\}<\/p>/g,
  '<p className="text-sm font-medium text-slate-700">{patient.phone}</p>\n                      {patient.email && <p className="text-xs text-indigo-600 mt-0.5">{patient.email}</p>}'
);

fs.writeFileSync('src/components/PatientHistory.tsx', code);
