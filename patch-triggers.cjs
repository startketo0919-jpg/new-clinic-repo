const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

// Inside addPatient (for new_patient / appointment_approved)
code = code.replace(
  /dispatchAction\('ADD_PATIENT', \{ patient: newPatient, newRecord \}\);\n\s*return clinicId;/,
  `dispatchAction('ADD_PATIENT', { patient: newPatient, newRecord });
    
    // Trigger templates
    const dateStr = new Date(checkInTime).toLocaleDateString();
    triggerTemplateEvent('new_patient', { ...newPatient, dateStr });
    
    return clinicId;`
);

// Inside addAppointment
code = code.replace(
  /dispatchAction\('ADD_APPOINTMENT', \{ appointment: newApp, newRecord \}\);\n\s*return newApp.id;/,
  `dispatchAction('ADD_APPOINTMENT', { appointment: newApp, newRecord });
    
    // Trigger templates
    const dateStr = new Date(newApp.date).toLocaleDateString();
    triggerTemplateEvent('appointment_scheduled', { ...newApp, dateStr });
    
    return newApp.id;`
);

// Inside updatePatientStatus (for next_in_queue)
code = code.replace(
  /if \(status === 'In Room'\) \{\n\s*dispatchAction\('UPDATE_CURRENT', \{ id \}\);\n\s*\}/,
  `if (status === 'In Room') {
      dispatchAction('UPDATE_CURRENT', { id });
      
      const targetPatient = state.patients.find(p => p.id === id);
      if (targetPatient) {
        triggerTemplateEvent('next_in_queue', targetPatient);
      }
    }`
);

// Replace follow_up
code = code.replace(
  /if \(state\.settings\.waAutoFollowUp\) {[\s\S]*?}\n\s*}\n\s*};\n/,
  `const patient = state.patientRegistry.find(p => p.clinicId === clinicId);
    if (patient) {
      const dateStr = new Date(date).toLocaleDateString();
      triggerTemplateEvent('follow_up', { ...patient, dateStr });
    }
  };\n`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
