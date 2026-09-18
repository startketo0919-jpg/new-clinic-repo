const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /const updatePatientStatus = \(id: string, status: PatientStatus\) => \{\n\s*const patient = state\.patients\.find\(p => p\.id === id\);\n\s*if \(patient && patient\.email\) \{\n\s*if \(status === 'In Room'\) \{\n\s*sendStyledEmail\(patient\.email, \{\n\s*subject: 'It is your turn! - Krishna Homoeopathic Clinic',\n\s*title: 'Doctor is ready',\n\s*heading: `Hey \$\{patient\.fullName\},`,\n\s*body: 'The doctor is ready to see you now\. Please proceed to the consultation room\.',\n\s*highlight: 'Status: In Room',\n\s*footer: \[\{ title: 'Thank you for your patience', desc: '' \}\]\n\s*\}\);\n\s*\}\n\s*\n\s*\/\/ If someone goes In Room, notify the NEXT person in line\.\n\s*if \(status === 'In Room'\) \{\n\s*const waitingPatients = state\.patients\n\s*\.filter\(p => p\.status === 'Waiting' && new Date\(p\.checkInTime\)\.toDateString\(\) === new Date\(\)\.toDateString\(\)\)\n\s*\.sort\(\(a, b\) => a\.checkInTime - b\.checkInTime\);\n\s*\n\s*if \(waitingPatients\.length > 0\) \{\n\s*const nextPatient = waitingPatients\[0\];\n\s*if \(nextPatient\.email && state\.settings\.emailAutoNextInQueue !== false\) \{\n\s*sendStyledEmail\(nextPatient\.email, \{\n\s*subject: 'You are next! - Krishna Homoeopathic Clinic',\n\s*title: 'Next in Queue',\n\s*heading: `Hey \$\{nextPatient\.fullName\},`,\n\s*body: 'You are next in the queue\. The doctor will see you shortly\. Please be ready\.',\n\s*highlight: `Token: \$\{nextPatient\.token\}`,\n\s*footer: \[\{ title: 'Current Status', desc: 'Next in queue' \}\]\n\s*\}\);\n\s*\}\n\s*\}\n\s*\n\s*\} else if \(status === 'Completed'\) \{\n\s*sendStyledEmail\(patient\.email, \{\n\s*subject: 'Thank you for visiting Krishna Homoeopathic Clinic',\n\s*title: 'Consultation Completed',\n\s*heading: `Hey \$\{patient\.fullName\},`,\n\s*body: 'Your consultation has been marked as completed\. We hope you feel better soon!',\n\s*footer: \[\{ title: 'Need further assistance\?', desc: 'Please contact the reception\.' \}\]\n\s*\}\);\n\s*\}\n\s*\}/,
  `const updatePatientStatus = (id: string, status: PatientStatus) => {
    const patient = state.patients.find(p => p.id === id);
    if (!patient) return;

    if (patient.email) {
      if (status === 'In Room') {
        sendStyledEmail(patient.email, {
          subject: 'It is your turn! - Krishna Homoeopathic Clinic',
          title: 'Doctor is ready',
          heading: \`Hey \${patient.fullName},\`,
          body: 'The doctor is ready to see you now. Please proceed to the consultation room.',
          highlight: 'Status: In Room',
          footer: [{ title: 'Thank you for your patience', desc: '' }]
        });
      } else if (status === 'Completed') {
        sendStyledEmail(patient.email, {
          subject: 'Thank you for visiting Krishna Homoeopathic Clinic',
          title: 'Consultation Completed',
          heading: \`Hey \${patient.fullName},\`,
          body: 'Your consultation has been marked as completed. We hope you feel better soon!',
          footer: [{ title: 'Need further assistance?', desc: 'Please contact the reception.' }]
        });
      }
    }

    // If someone goes In Room, notify the NEXT person in line.
    if (status === 'In Room') {
       const waitingPatients = state.patients
          .filter(p => p.status === 'Waiting' && p.id !== id && new Date(p.checkInTime).toDateString() === new Date().toDateString())
          .sort((a, b) => a.checkInTime - b.checkInTime);
       
       if (waitingPatients.length > 0) {
          const nextPatient = waitingPatients[0];
          if (nextPatient.email && state.settings.emailAutoNextInQueue !== false) {
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
    }`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
