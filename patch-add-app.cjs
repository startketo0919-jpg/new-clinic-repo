const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /dispatchAction\('ADD_APPOINTMENT', \{ appointment: app, newRecord \}\);\n\s*return clinicId;/,
  `dispatchAction('ADD_APPOINTMENT', { appointment: app, newRecord });
    
    const dateStr = new Date(app.date).toLocaleDateString();
    
    // Legacy event
    triggerTemplateEvent('appointment_scheduled', { ...app, dateStr });
    
    // Self check-in events
    if (newRecord) {
      triggerTemplateEvent('pid_generated_self', { ...app, dateStr });
      triggerTemplateEvent('queue_new_self', { ...app, dateStr });
    } else {
      triggerTemplateEvent('queue_old_self', { ...app, dateStr });
    }
    
    return clinicId;`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
