const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

// We need to replace executeCheckIn function body.
const newFunc = `  const executeCheckIn = (explicitClinicId?: string) => {
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
    setPhone('');
    setAge('');
    setGender('Male');
    setVisitType('Follow-up');
    setVisitDate(availableDates[0]);
    setDuplicatePrompt(null);
  };`;

// Try to use string replacement, or regex
code = code.replace(/const executeCheckIn = \(explicitClinicId\?: string\) => \{[\s\S]*?setDuplicatePrompt\(null\);\s*\};/, newFunc);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
