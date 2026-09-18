const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  "const updatePatientStatus = (id: string, status: PatientStatus) => {",
  `const updatePatientStatus = (id: string, status: PatientStatus) => {
    const patient = state.patients.find(p => p.id === id);
    if (patient && patient.email) {
      if (status === 'In Room') {
        sendStyledEmail(patient.email, {
          subject: 'It is your turn!',
          title: 'Doctor is ready',
          heading: \`Hi \${patient.fullName},\`,
          body: 'The doctor is ready to see you now. Please proceed to the consultation room.',
          highlight: 'Status: In Room',
          footer: [{ title: 'Thank you for your patience', desc: '' }]
        });
      } else if (status === 'Completed') {
        sendStyledEmail(patient.email, {
          subject: 'Thank you for visiting',
          title: 'Consultation Completed',
          heading: \`Hi \${patient.fullName},\`,
          body: 'Your consultation has been marked as completed. We hope you feel better soon!',
          footer: [{ title: 'Need further assistance?', desc: 'Please contact the reception.' }]
        });
      }
    }
`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
