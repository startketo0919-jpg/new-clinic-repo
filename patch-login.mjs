import fs from 'fs';
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const loginStates = `
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
`;

code = code.replace(
  "const [showPasswordInput, setShowPasswordInput] = useState(false);",
  loginStates
);

const handleOtpRequest = `
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError('Please enter your email');
    const user = state.users.find(u => u.email === email);
    if (!user) return setError('Email not found in system. Please contact admin.');
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName: user.username })
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Failed to send OTP');
      }
      setOtpSent(true);
    } catch(err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return setError('Please enter the OTP');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Invalid OTP');
      }
      
      const user = state.users.find(u => u.email === email);
      if (user) {
        sessionStorage.setItem('staffAuthenticated', 'true');
        sessionStorage.setItem('userRole', user.role);
        sessionStorage.setItem('username', user.username);
        navigate('/dashboard');
      }
    } catch(err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(
  "const handleStaffLogin = (e: React.FormEvent) => {",
  handleOtpRequest + "\n  const handleStaffLogin = (e: React.FormEvent) => {"
);

const formReplacement = `
            {!showPasswordInput ? (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { setShowPasswordInput(true); setLoginMethod('password'); }}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
                >
                  <UserRound className="w-5 h-5" />
                  Login with Password
                </button>
                <button 
                  onClick={() => { setShowPasswordInput(true); setLoginMethod('otp'); }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
                >
                  <Monitor className="w-5 h-5" />
                  Login with Email OTP
                </button>
              </div>
            ) : loginMethod === 'password' ? (
              <form onSubmit={handleStaffLogin} className="flex flex-col gap-3">
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    required
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    required
                  />
                </div>
                {error && <p className="text-rose-500 text-sm font-medium">{error}</p>}
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setShowPasswordInput(false); setPassword(''); setUsername(''); setError(''); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-6 rounded-xl transition-all"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
                  >
                    Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="flex flex-col gap-3">
                {!otpSent ? (
                  <div className="relative">
                    <UserIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      placeholder="Enter OTP"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-center tracking-widest font-mono text-xl"
                      required
                      autoFocus
                      maxLength={6}
                    />
                  </div>
                )}
                {error && <p className="text-rose-500 text-sm font-medium">{error}</p>}
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setShowPasswordInput(false); setEmail(''); setOtp(''); setOtpSent(false); setError(''); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-6 rounded-xl transition-all"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Wait...' : otpSent ? 'Verify OTP' : 'Send OTP'}
                  </button>
                </div>
              </form>
            )}
`;

code = code.replace(
  /\{\!showPasswordInput \? \([\s\S]*?<\/form>\n            \)\}/,
  formReplacement
);

fs.writeFileSync('src/pages/Login.tsx', code);
