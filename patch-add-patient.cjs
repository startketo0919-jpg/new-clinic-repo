const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /triggerTemplateEvent\('new_patient', \{ \.\.\.newPatient, dateStr \}\);\n\s*return clinicId;/,
  `triggerTemplateEvent('new_patient', { ...newPatient, dateStr });
    
    if (newRecord) {
      triggerTemplateEvent('pid_generated', { ...newPatient, dateStr });
    }
    
    return clinicId;`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
