const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

if (!code.includes('const currentlyWaiting')) {
  code = code.replace(
    /const totalPatients = todaysPatients\.length;/,
    `const totalPatients = todaysPatients.length;
  const currentlyWaiting = todaysPatients.filter(p => p.status === 'Waiting').length;
  const patientsWaitingApproval = state.appointments.filter(a => isSameDayLocal(a.date, todayStr)).length;`
  );
  fs.writeFileSync('src/pages/Dashboard.tsx', code);
}
