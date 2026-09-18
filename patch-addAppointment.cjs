const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

// Also inject the sendStyledEmail helper inside ClinicContext
const emailHelper = `
  const sendStyledEmail = async (email: string, payload: any) => {
    if(!email) return;
    try {
      await fetch('/api/send-styled-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...payload })
      });
    } catch(err) {
      console.error('Failed to send email notification:', err);
    }
  };
`;
code = code.replace(
  "const sendWhatsAppMessage = async (phone: string, content: string, templateName?: string, templateLanguage?: string, templateComponents?: any[]) => {",
  emailHelper + "\n  const sendWhatsAppMessage = async (phone: string, content: string, templateName?: string, templateLanguage?: string, templateComponents?: any[]) => {"
);

// We need to trigger emails in addAppointment
code = code.replace(
  "triggerTemplateEvent('appointment_scheduled', { ...app, dateStr });",
  "triggerTemplateEvent('appointment_scheduled', { ...app, dateStr });\n\n    if (app.email) {\n      sendStyledEmail(app.email, {\n        subject: 'Appointment Scheduled',\n        title: 'Appointment Scheduled',\n        heading: `Hi ${app.fullName},`,\n        body: `Your appointment has been successfully scheduled for ${dateStr}.`,\n        highlight: dateStr,\n        footer: [\n          { title: 'Any questions?', desc: 'Feel free to reply to this email.' }\n        ]\n      });\n    }"
);

// Add email to checkIn to trigger token emails
code = code.replace(
  "triggerTemplateEvent('walk_in_registered', { ...newRecord, ...patientData, token });",
  "triggerTemplateEvent('walk_in_registered', { ...newRecord, ...patientData, token });\n    \n    if (patientData.email || newRecord?.email) {\n      const pEmail = patientData.email || newRecord?.email;\n      sendStyledEmail(pEmail, {\n        subject: 'You are in the queue!',\n        title: 'Check-in Successful',\n        heading: `Hi ${patientData.fullName},`,\n        body: `You have successfully checked in to the clinic. Your token number is:`,\n        highlight: `Token: ${token}`,\n        footer: [\n          { title: 'Track your status', desc: 'Keep an eye on the waiting room monitor or tracker.' }\n        ]\n      });\n    }"
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
