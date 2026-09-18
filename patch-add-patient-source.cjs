const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

// Update interface
code = code.replace(
  /addPatient: \(patient: Omit<Patient, 'id' \| 'clinicId' \| 'token' \| 'status' \| 'checkInTime' \| 'waitElapsed'>, explicitClinicId\?: string, visitDateStr\?: string\) => void;/,
  `addPatient: (patient: Omit<Patient, 'id' | 'clinicId' | 'token' | 'status' | 'checkInTime' | 'waitElapsed'>, explicitClinicId?: string, visitDateStr?: string, source?: 'staff' | 'self') => void;`
);

// Update implementation signature
code = code.replace(
  /const addPatient = \(data: Omit<Patient, 'id' \| 'clinicId' \| 'token' \| 'status' \| 'checkInTime' \| 'waitElapsed'>, explicitClinicId\?: string, visitDateStr\?: string\) => \{/,
  `const addPatient = (data: Omit<Patient, 'id' | 'clinicId' | 'token' | 'status' | 'checkInTime' | 'waitElapsed'>, explicitClinicId?: string, visitDateStr?: string, source: 'staff' | 'self' = 'staff') => {`
);

// Update triggers
const oldTriggers = `triggerTemplateEvent('new_patient', { ...newPatient, dateStr });
    
    if (newRecord) {
      triggerTemplateEvent('pid_generated', { ...newPatient, dateStr });
    }`;
    
const newTriggers = `// Trigger templates
    const dateStr = new Date(checkInTime).toLocaleDateString();
    
    // Legacy generic events
    triggerTemplateEvent('new_patient', { ...newPatient, dateStr });
    if (newRecord) {
      triggerTemplateEvent('pid_generated', { ...newPatient, dateStr });
    }
    
    // Source-specific events
    if (newRecord) {
      if (source === 'self') {
        triggerTemplateEvent('pid_generated_self', { ...newPatient, dateStr });
        triggerTemplateEvent('queue_new_self', { ...newPatient, dateStr });
      } else {
        triggerTemplateEvent('pid_generated_staff', { ...newPatient, dateStr });
        triggerTemplateEvent('queue_new_staff', { ...newPatient, dateStr });
      }
    } else {
      if (source === 'self') {
        triggerTemplateEvent('queue_old_self', { ...newPatient, dateStr });
      } else {
        triggerTemplateEvent('queue_old_staff', { ...newPatient, dateStr });
      }
    }`;

code = code.replace(oldTriggers, newTriggers);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
