const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

code = code.replace(
  "const getLocalTodayString() = getLocalTodayString();",
  "const todayStr = getLocalTodayString();"
);
code = code.replace(
  "visitDate === getLocalTodayString() ? 'patient'",
  "visitDate === todayStr ? 'patient'"
);
code = code.replace(
  "const todayStr = getLocalTodayString();",
  "const todayStr = getLocalTodayString();"
);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
