const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

code = code.replace(
  /\{d === new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\] \? 'Today' : format\(new Date\(d\), 'MMM d, yyyy'\)\}/,
  `{d === todayStr ? 'Today' : format(new Date(d), 'MMM d, yyyy')}`
);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
