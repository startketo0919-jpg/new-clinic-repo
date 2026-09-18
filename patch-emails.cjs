const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

// 1. In Room / Next in queue logic
code = code.replace(
  /sendStyledEmail\(patient\.email, \{\n\s*subject: 'It is your turn!',\n\s*title: 'Doctor is ready',\n\s*heading: `Hi \$\{patient\.fullName\},`,\n\s*body: 'The doctor is ready to see you now\. Please proceed to the consultation room\.',\n\s*highlight: 'Status: In Room',\n\s*footer: \[\{ title: 'Thank you for your patience', desc: '' \}\]\n\s*\}\);/,
  `sendStyledEmail(patient.email, {
          subject: 'It is your turn! - Krishna Homoeopathic Clinic',
          title: 'Doctor is ready',
          heading: \`Hey \${patient.fullName},\`,
          body: 'The doctor is ready to see you now. Please proceed to the consultation room.',
          highlight: 'Status: In Room',
          footer: [{ title: 'Thank you for your patience', desc: '' }]
        });
      }
      
      // If someone goes In Room, notify the NEXT person in line.
      if (status === 'In Room') {
         const waitingPatients = state.patients
            .filter(p => p.status === 'Waiting' && new Date(p.checkInTime).toDateString() === new Date().toDateString())
            .sort((a, b) => a.checkInTime - b.checkInTime);
         
         if (waitingPatients.length > 0) {
            const nextPatient = waitingPatients[0];
            if (nextPatient.email) {
               sendStyledEmail(nextPatient.email, {
                 subject: 'You are next! - Krishna Homoeopathic Clinic',
                 title: 'Next in Queue',
                 heading: \`Hey \${nextPatient.fullName},\`,
                 body: 'You are next in the queue. The doctor will see you shortly. Please be ready.',
                 highlight: \`Token: \${nextPatient.token}\`,
                 footer: [{ title: 'Current Status', desc: 'Next in queue' }]
               });
            }
         }
      `
);

// 2. Completed Consultation Email
code = code.replace(
  /sendStyledEmail\(patient\.email, \{\n\s*subject: 'Thank you for visiting',\n\s*title: 'Consultation Completed',\n\s*heading: `Hi \$\{patient\.fullName\},`,\n\s*body: 'Your consultation has been marked as completed\. We hope you feel better soon!',\n\s*footer: \[\{ title: 'Need further assistance\?', desc: 'Please contact the reception\.' \}\]\n\s*\}\);/,
  `sendStyledEmail(patient.email, {
          subject: 'Thank you for visiting Krishna Homoeopathic Clinic',
          title: 'Consultation Completed',
          heading: \`Hey \${patient.fullName},\`,
          body: 'Your consultation has been marked as completed. We hope you feel better soon!',
          footer: [{ title: 'Need further assistance?', desc: 'Please contact the reception.' }]
        });`
);

// 3. Appointment Scheduled Email
code = code.replace(
  /sendStyledEmail\(app\.email, \{\n\s*subject: 'Appointment Scheduled',\n\s*title: 'Appointment Scheduled',\n\s*heading: `Hi \$\{app\.fullName\},`,\n\s*body: `Your appointment has been successfully scheduled for \$\{dateStr\}\.`,\n\s*highlight: dateStr,\n\s*footer: \[\n\s*\{ title: 'Any questions\?', desc: 'Feel free to reply to this email\.' \}\n\s*\]\n\s*\}\);/,
  `sendStyledEmail(app.email, {
        subject: 'Appointment Scheduled - Krishna Homoeopathic Clinic',
        title: 'Appointment Confirmed',
        heading: \`Hey \${app.fullName},\`,
        body: \`Your appointment has been successfully scheduled for \${dateStr}.\`,
        highlight: dateStr,
        footer: [
          { title: 'Any questions?', desc: 'Feel free to reply to this email.' }
        ]
      });`
);

// 4. Follow up Date Scheduled
code = code.replace(
  /const dateStr = new Date\(date\)\.toLocaleDateString\(\);\n\s*triggerTemplateEvent\('follow_up', \{ \.\.\.patient, dateStr \}\);\n\s*\}/,
  `const dateStr = new Date(date).toLocaleDateString();
      triggerTemplateEvent('follow_up', { ...patient, dateStr });
      if (patient.email) {
        sendStyledEmail(patient.email, {
          subject: 'Follow-up Scheduled - Krishna Homoeopathic Clinic',
          title: 'Follow-up Appointment',
          heading: \`Hey \${patient.fullName},\`,
          body: \`Your follow-up has been scheduled for \${dateStr}. Please make sure to visit us on the specified date.\`,
          highlight: \`Date: \${dateStr}\`,
          footer: [{ title: 'Stay Healthy', desc: 'Krishna Homoeopathic Clinic' }]
        });
      }
    }`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
