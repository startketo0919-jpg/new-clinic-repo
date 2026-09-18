const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

// Add email state and OTP states
code = code.replace(
  "const [fullName, setFullName] = useState('');",
  "const [email, setEmail] = useState('');\n  const [otp, setOtp] = useState('');\n  const [showOtpStep, setShowOtpStep] = useState(false);\n  const [otpError, setOtpError] = useState('');\n  const [fullName, setFullName] = useState('');"
);

// clear email and otp in executeCheckIn
code = code.replace(
  "setFullName('');",
  "setFullName('');\n    setEmail('');\n    setOtp('');\n    setShowOtpStep(false);\n    setOtpError('');"
);

// modify handleCheckIn to send OTP
code = code.replace(
  "const handleCheckIn = (e: React.FormEvent) => {\n    e.preventDefault();\n    if (phone.length !== 10) return;",
  `const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return;
    if (!email) {
      alert("Email is required for OTP verification");
      return;
    }
    
    if (!showOtpStep) {
      // Send OTP
      setOtpError('');
      try {
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
          setShowOtpStep(true);
        } else {
          setOtpError(data.error || 'Failed to send OTP');
        }
      } catch(err) {
        setOtpError('Failed to send OTP');
      }
      return;
    } else {
      // Verify OTP
      try {
        const res = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp })
        });
        const data = await res.json();
        if (!data.success) {
          setOtpError(data.error || 'Invalid OTP');
          return;
        }
      } catch(err) {
        setOtpError('Failed to verify OTP');
        return;
      }
    }`
);

// Modify UI
const emailInput = `
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email (for OTP)</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="e.g. you@example.com"
                    disabled={showOtpStep}
                  />
                </div>
`;

code = code.replace(
  /<div>\s*<label className="block text-sm font-medium text-slate-700 mb-1">Full Name<\/label>/,
  emailInput + '\n                <div>\n                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>'
);

// Wrap existing inputs in {!showOtpStep && ...} or just disable them? Better to just disable them or conditionally show OTP field.
// Actually, let's just add the OTP field above the submit button
const otpInput = `
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
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all active:scale-[0.98] mt-2"
                >
                  {showOtpStep ? "Verify & Book Appointment" : (visitDate === getLocalTodayString() ? "Get Token for Today" : "Book Appointment")}
                </button>
`;

code = code.replace(
  /<button \s*type="submit"\s*className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all active:scale-\[0\.98\] mt-2"\s*>\s*\{visitDate === todayStr \? "Get Token for Today" : "Book Appointment"\}\s*<\/button>/,
  otpInput
);

code = code.replace(/todayStr/g, "getLocalTodayString()");

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
