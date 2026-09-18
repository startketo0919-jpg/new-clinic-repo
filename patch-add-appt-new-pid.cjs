const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /\/\/ Self check-in events\n\s*if \(newRecord\) \{/,
  `// Self check-in events
    if (newRecord) {
      if (app.email && state.settings.emailAutoNewPid !== false) {
        sendStyledEmail(app.email, {
          subject: 'Welcome to Krishna Homoeopathic Clinic - Your Registration Details',
          title: 'Registration Successful',
          heading: \`Hey \${app.fullName},\`,
          body: \`Your patient profile has been successfully created. Here are your registration details:<br/><br/>
                 <b>Patient Name:</b> \${app.fullName}<br/>
                 <b>Age:</b> \${app.age} yrs<br/>
                 <b>Date of Registration:</b> \${dateStr}<br/>
                 Keep your PID safe, you can use it for quick check-ins in the future.\`,
          highlight: \`PID: \${app.clinicId}\`,
          footer: [
            { title: 'Thank you for choosing us', desc: 'Krishna Homoeopathic Clinic' }
          ]
        });
      }`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
