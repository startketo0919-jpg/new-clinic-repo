const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /const nextPatient = state\.patients\.find\(p => p\.id !== id && p\.status === 'Waiting'\);/,
  `// Find the next patient in line (first patient who is Waiting today)
      const today = new Date();
      const nextPatient = state.patients.find(p => {
        if (p.id === id || p.status !== 'Waiting') return false;
        const checkInDate = new Date(p.checkInTime);
        return checkInDate.getDate() === today.getDate() && 
               checkInDate.getMonth() === today.getMonth() && 
               checkInDate.getFullYear() === today.getFullYear();
      });`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
