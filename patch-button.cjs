const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

const originalButton = `
                <button 
                  type="submit"
                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  Submit Request
                </button>
`;

const otpInputAndButton = `
                {showOtpStep && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Enter OTP</label>
                    <input 
                      type="text" 
                      required 
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-center tracking-widest text-lg font-bold"
                      placeholder="123456"
                    />
                    {otpError && <p className="text-red-500 text-sm mt-1">{otpError}</p>}
                  </div>
                )}
                
                <button 
                  type="submit"
                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  {showOtpStep ? "Verify OTP & Submit" : "Submit Request"}
                </button>
`;

// we need to use a regex that matches variations in whitespace just in case
code = code.replace(
  /<button\s+type="submit"\s+className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all active:scale-\[0\.98\]"\s*>\s*Submit Request\s*<\/button>/,
  otpInputAndButton
);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
