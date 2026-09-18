const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

// 1. Add "emailAutoCheckIn" toggle and "emailAutoNewPid" email
code = code.replace(
  /if \(newPatient\.email \|\| newRecord\?\.email\) \{[\s\S]*?\}\n\s*if \(newRecord\) \{/,
  `if (newPatient.email || newRecord?.email) {
      const pEmail = newPatient.email || newRecord?.email;
      if (state.settings.emailAutoCheckIn !== false) {
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

      if (newRecord && state.settings.emailAutoNewPid !== false) {
        sendStyledEmail(pEmail, {
          subject: 'Welcome to Krishna Homoeopathic Clinic - Your Registration Details',
          title: 'Registration Successful',
          heading: \`Hey \${newPatient.fullName},\`,
          body: \`Your patient profile has been successfully created. Here are your registration details:<br/><br/>
                 <b>Patient Name:</b> \${newPatient.fullName}<br/>
                 <b>Age:</b> \${newPatient.age} yrs<br/>
                 <b>Date of Registration:</b> \${dateStr}<br/>
                 Keep your PID safe, you can use it for quick check-ins in the future.\`,
          highlight: \`PID: \${newPatient.clinicId}\`,
          footer: [
            { title: 'Thank you for choosing us', desc: 'Krishna Homoeopathic Clinic' }
          ]
        });
      }
    }
    
    if (newRecord) {`
);

// 2. Next In Queue Email Toggle
code = code.replace(
  /if \(nextPatient\.email\) \{\n\s*sendStyledEmail\(nextPatient\.email, \{/,
  `if (nextPatient.email && state.settings.emailAutoNextInQueue !== false) {
               sendStyledEmail(nextPatient.email, {`
);

// 3. Appointment Confirmed Toggle & Remove "feel free to reply"
code = code.replace(
  /if \(se\.email\) \{\n\s*sendStyledEmail\(se\.email, \{\n\s*subject: 'Appointment Scheduled - Krishna Homoeopathic Clinic',\n\s*title: 'Appointment Confirmed',\n\s*heading: `Hey \$\{se\.fullName\},`,\n\s*body: `Your appointment has been successfully scheduled for \$\{he\}\.`,\n\s*highlight: he,\n\s*footer: \[\n\s*\{ title: 'Any questions\?', desc: 'Feel free to reply to this email\.' \}\n\s*\]\n\s*\}\);\n\s*\}/,
  `if (se.email && state.settings.emailAutoApptConfirmed !== false) {
      sendStyledEmail(se.email, {
        subject: 'Appointment Scheduled - Krishna Homoeopathic Clinic',
        title: 'Appointment Confirmed',
        heading: \`Hey \${se.fullName},\`,
        body: \`Your appointment has been successfully scheduled for \${he}.\`,
        highlight: he,
        footer: []
      });
    }`
);

// 4. Follow Up Date Email Toggle
code = code.replace(
  /if \(L\.email\) \{\n\s*sendStyledEmail\(L\.email, \{/,
  `if (L.email && state.settings.emailAutoFollowUp !== false) {
        sendStyledEmail(L.email, {`
);


fs.writeFileSync('src/context/ClinicContext.tsx', code);
