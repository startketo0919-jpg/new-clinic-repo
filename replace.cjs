const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');
code = code.replace(/const executeCheckIn = \(explicitClinicId\?: string\) => \{[\s\S]*?setPhone\(''\);/, `const executeCheckIn = (explicitClinicId?: string) => {
    const generatedId = addAppointment({
      fullName,
      phone,
      age: parseInt(age, 10),
      gender,
      visitType,
      shiftPreference,
      date: visitDate
    }, explicitClinicId);
    
    setCheckInSuccess(true);
    setTimeout(() => {
      setCheckInSuccess(false);
      setSearchQuery(generatedId);
      setActiveTab('track');
      setTrackedClinicId(generatedId);
    }, 2000);
    setFullName('');
    setPhone('');`);
fs.writeFileSync('src/pages/PatientTracker.tsx', code);
