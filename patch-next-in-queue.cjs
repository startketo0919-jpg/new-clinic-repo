const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /const targetPatient = state\.patients\.find\(p => p\.id === id\);\n\s*if \(targetPatient\) \{\n\s*triggerTemplateEvent\('next_in_queue', targetPatient\);\n\s*\}/,
  `// Find the next patient in line (first patient who is Waiting)
      const nextPatient = state.patients.find(p => p.id !== id && p.status === 'Waiting');
      if (nextPatient) {
        triggerTemplateEvent('next_in_queue', nextPatient);
      }`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
