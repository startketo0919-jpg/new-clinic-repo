const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

// Add to interface
code = code.replace(
  /cancelAppointment: \(id: string\) => void;/,
  `cancelAppointment: (id: string) => void;
  approveAppointment: (app: Appointment) => void;`
);

// Implement approveAppointment
const approveFn = `  const approveAppointment = (app: Appointment) => {
    addPatient({
      fullName: app.fullName,
      phone: app.phone,
      age: app.age,
      gender: app.gender,
      priority: 'Normal',
      visitType: app.visitType,
      shiftPreference: app.shiftPreference || 'Morning'
    }, app.clinicId, app.date, 'staff');
    
    cancelAppointment(app.id);
    
    const dateStr = new Date(app.date).toLocaleDateString();
    triggerTemplateEvent('appointment_approved', { ...app, dateStr });
  };`;

code = code.replace(
  /const cancelAppointment = \(id: string\) => \{/,
  `${approveFn}\n\n  const cancelAppointment = (id: string) => {`
);

// Export it
code = code.replace(
  /cancelAppointment,\n\s*updateSettings/,
  `cancelAppointment,\n    approveAppointment,\n    updateSettings`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
