const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /sendStyledEmail\(pEmail, \{\n\s*subject: 'You are in the queue!',\n\s*title: 'Check-in Successful',\n\s*heading: `Hi \$\{patientData\.fullName\},`,\n\s*body: `You have successfully checked in to the clinic\. Your token number is:`,\n\s*highlight: `Token: \$\{token\}`,\n\s*footer: \[\n\s*\{ title: 'Track your status', desc: 'Keep an eye on the waiting room monitor or tracker\.' \}\n\s*\]\n\s*\}\);/,
  `sendStyledEmail(pEmail, {
        subject: 'You are in the queue! - Krishna Homoeopathic Clinic',
        title: 'Check-in Successful',
        heading: \`Hey \${patientData.fullName},\`,
        body: \`You have successfully checked in to Krishna Homoeopathic Clinic. Your token number is:\`,
        highlight: \`Token: \${token}\`,
        footer: [
          { title: 'Track your status', desc: 'Keep an eye on the waiting room monitor or tracker.' }
        ]
      });`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
