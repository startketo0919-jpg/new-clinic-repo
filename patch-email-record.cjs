const fs = require('fs');
let code = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');

code = code.replace(
  /newRecord = \{\n\s*clinicId,\n\s*fullName: data\.fullName,\n\s*phone: data\.phone,\n\s*age: data\.age,\n\s*gender: data\.gender,\n\s*firstVisit: checkInTime,\n\s*lastVisited: checkInTime\n\s*\};/g,
  `newRecord = {
          clinicId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          age: data.age,
          gender: data.gender,
          firstVisit: checkInTime,
          lastVisited: checkInTime
        };`
);

code = code.replace(
  /newRecord = \{\n\s*clinicId,\n\s*fullName: data\.fullName,\n\s*phone: data\.phone,\n\s*age: data\.age,\n\s*gender: data\.gender,\n\s*firstVisit: Date\.now\(\),\n\s*lastVisited: Date\.now\(\)\n\s*\};/g,
  `newRecord = {
          clinicId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          age: data.age,
          gender: data.gender,
          firstVisit: Date.now(),
          lastVisited: Date.now()
        };`
);

fs.writeFileSync('src/context/ClinicContext.tsx', code);
