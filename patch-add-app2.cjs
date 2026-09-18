const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

// Update Interface
code = code.replace(
  /addAppointment: \(app: Omit<Appointment, 'id' \| 'clinicId'>\) => string;/,
  `addAppointment: (app: Omit<Appointment, 'id' | 'clinicId'>, explicitClinicId?: string, source?: 'staff' | 'self') => string;`
);
// Some versions might have different signatures in the interface, let's catch both
code = code.replace(
  /addAppointment: \(data: Omit<Appointment, 'id' \| 'clinicId'>, explicitClinicId\?: string\) => string;/,
  `addAppointment: (data: Omit<Appointment, 'id' | 'clinicId'>, explicitClinicId?: string, source?: 'staff' | 'self') => string;`
);

// Update implementation
code = code.replace(
  /const addAppointment = \(data: Omit<Appointment, 'id' \| 'clinicId'>, explicitClinicId\?: string\) => \{/,
  `const addAppointment = (data: Omit<Appointment, 'id' | 'clinicId'>, explicitClinicId?: string, source: 'staff' | 'self' = 'staff') => {`
);

// Update the source-specific events inside addAppointment
code = code.replace(
  /if \(newRecord\) \{\n\s*triggerTemplateEvent\('pid_generated_self', \{ \.\.\.app, dateStr \}\);\n\s*triggerTemplateEvent\('queue_new_self', \{ \.\.\.app, dateStr \}\);\n\s*\} else \{\n\s*triggerTemplateEvent\('queue_old_self', \{ \.\.\.app, dateStr \}\);\n\s*\}/,
  `if (newRecord) {
      triggerTemplateEvent('pid_generated', { ...app, dateStr }); // Generic
      if (source === 'self') {
        triggerTemplateEvent('pid_generated_self', { ...app, dateStr });
        triggerTemplateEvent('queue_new_self', { ...app, dateStr });
      } else {
        triggerTemplateEvent('pid_generated_staff', { ...app, dateStr });
        triggerTemplateEvent('queue_new_staff', { ...app, dateStr });
      }
    } else {
      if (source === 'self') {
        triggerTemplateEvent('queue_old_self', { ...app, dateStr });
      } else {
        triggerTemplateEvent('queue_old_staff', { ...app, dateStr });
      }
    }`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
