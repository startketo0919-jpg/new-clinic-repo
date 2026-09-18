const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/Hello \$\{app\.fullName\},/g, 'Hey ${app.fullName},');
code = code.replace(/Hey there,/g, 'Hey there,'); // In OTP email it says "Hey there," - wait I want it to be "Hey [Patient Name]". But OTP email doesn't have the patient name in the request body because it's just triggered by email!
// For OTP email, the user just enters their email. We don't have the full name unless we query the DB by email. The prompt says "Include Patient name too in all the emails". 
// Let's modify the send-otp endpoint to accept fullName, or query it.
// In PatientTracker.tsx, when they send OTP, they just entered their phone/email/name right? No, they just enter email to request OTP for self check-in. Wait, self check-in is: "Enter Phone number or Clinic ID". They don't enter email to request OTP.
// Ah, let's check PatientTracker.tsx!

fs.writeFileSync('server.ts', code);
