const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /if \(app\.email\) \{\n\s*sendStyledEmail\(app\.email, \{\n\s*subject: 'Appointment Scheduled - Krishna Homoeopathic Clinic',\n\s*title: 'Appointment Confirmed',\n\s*heading: `Hey \$\{app\.fullName\},`,\n\s*body: `Your appointment has been successfully scheduled for \$\{dateStr\}\.`,\n\s*highlight: dateStr,\n\s*footer: \[\n\s*\{ title: 'Any questions\?', desc: 'Feel free to reply to this email\.' \}\n\s*\]\n\s*\}\);\n\s*\}/,
  `if (app.email && state.settings.emailAutoApptConfirmed !== false) {
      sendStyledEmail(app.email, {
        subject: 'Appointment Scheduled - Krishna Homoeopathic Clinic',
        title: 'Appointment Confirmed',
        heading: \`Hey \${app.fullName},\`,
        body: \`Your appointment has been successfully scheduled for \${dateStr}.\`,
        highlight: dateStr,
        footer: []
      });
    }`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
