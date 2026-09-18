const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

code = code.replace(
  '{otpError && <p className="text-red-500 text-sm mt-1">{otpError}</p>}',
  ''
);

code = code.replace(
  '<button \n                  type="submit"',
  '{otpError && <div className="text-red-500 text-sm font-medium mb-2 p-3 bg-red-50 border border-red-100 rounded-lg">{otpError}</div>}\n                <button \n                  type="submit"'
);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
