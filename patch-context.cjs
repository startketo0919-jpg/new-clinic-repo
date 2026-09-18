const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /if \(k === 'Wait Time'\) val = \(data\.waitElapsed \|\| ''\)\.toString\(\);/,
  `if (k === 'Wait Time') {
          // Calculate estimated wait time based on the live queue
          const todaysPatients = state.patients.filter(p => new Date(p.checkInTime).toLocaleDateString() === new Date().toLocaleDateString());
          const waitingPatients = todaysPatients.filter(p => p.status === 'Waiting');
          const position = waitingPatients.findIndex(p => p.id === data.id);
          
          if (position !== -1) {
            let estimated = 0;
            for (let i = 0; i < position; i++) {
              const vt = waitingPatients[i].visitType;
              if (vt === 'New') estimated += 10;
              else if (vt === 'Follow-up') estimated += 5;
              else if (vt === 'Report Review') estimated += 2;
              else estimated += 5;
            }
            const elapsed = Math.floor((Date.now() - data.checkInTime) / 60000);
            val = Math.max(0, estimated - elapsed).toString();
          } else {
            val = (data.waitElapsed || '').toString();
          }
        }`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
