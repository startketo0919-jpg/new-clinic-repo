const fs = require('fs');
let code = fs.readFileSync('src/components/QueueList.tsx', 'utf8');

code = code.replace(
  /\{formatWaitTime\(patient\.waitElapsed\)\}/g,
  `{formatWaitTime(Math.max(0, Math.floor((Date.now() - patient.checkInTime) / 60000)))}`
);

fs.writeFileSync('src/components/QueueList.tsx', code);
