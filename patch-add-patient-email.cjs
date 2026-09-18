const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /triggerTemplateEvent\('new_patient', \{ \.\.\.newPatient, dateStr \}\);/,
  `triggerTemplateEvent('new_patient', { ...newPatient, dateStr });
    
    if (newPatient.email || newRecord?.email) {
      const pEmail = newPatient.email || newRecord?.email;
      sendStyledEmail(pEmail, {
        subject: 'You are in the queue! - Krishna Homoeopathic Clinic',
        title: 'Check-in Successful',
        heading: \`Hey \${newPatient.fullName},\`,
        body: \`You have successfully checked in to Krishna Homoeopathic Clinic. Your token number is:\`,
        highlight: \`Token: \${newPatient.token}\`,
        footer: [
          { title: 'Track your status', desc: 'Keep an eye on the waiting room monitor or tracker.' }
        ]
      });
    }
  `
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
