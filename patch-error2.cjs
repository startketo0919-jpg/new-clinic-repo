const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

// revert the first wrong replacement
code = code.replace(
  '{otpError && <div className="text-red-500 text-sm font-medium mb-2 p-3 bg-red-50 border border-red-100 rounded-lg">{otpError}</div>}\n                <button \n                  type="submit"\n                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-2xl shadow-md transition-all active:scale-[0.98]"\n                >\n                  Track Now',
  '<button \n                  type="submit"\n                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-2xl shadow-md transition-all active:scale-[0.98]"\n                >\n                  Track Now'
);

// apply to the correct button
code = code.replace(
  '<button \n                  type="submit"\n                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all active:scale-[0.98]"\n                >\n                  {showOtpStep ? "Verify OTP & Submit" : "Submit Request"}',
  '{otpError && <div className="text-red-500 text-sm font-medium mb-2 p-3 bg-red-50 border border-red-100 rounded-lg">{otpError}</div>}\n                <button \n                  type="submit"\n                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all active:scale-[0.98]"\n                >\n                  {showOtpStep ? "Verify OTP & Submit" : "Submit Request"}'
);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
