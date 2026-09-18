const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /if \(patient\.email\) \{\n\s*sendStyledEmail\(patient\.email, \{/,
  `if (patient.email && state.settings.emailAutoFollowUp !== false) {
        sendStyledEmail(patient.email, {`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
