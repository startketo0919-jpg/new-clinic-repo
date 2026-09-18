const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /triggerTemplateEvent\('appointment_approved', \{ \.\.\.app, dateStr \}\);\n\s*\};/,
  `triggerTemplateEvent('appointment_approved', { ...app, dateStr });

    if (app.email && state.settings.emailAutoApptConfirmed !== false) {
      sendStyledEmail(app.email, {
        subject: 'Appointment Approved - Krishna Homoeopathic Clinic',
        title: 'Appointment Approved',
        heading: \`Hey \${app.fullName},\`,
        body: \`Your appointment for \${dateStr} has been approved and you have been added to the queue for that day.\`,
        highlight: dateStr,
        footer: []
      });
    }
  };`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
