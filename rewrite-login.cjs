const fs = require('fs');

const loginCode = `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Monitor, Smartphone, UserRound, Lock, User as UserIcon } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';

export default function Login() {
  const navigate = useNavigate();
  const { state } = useClinic();
  
  const [step, setStep] = useState<'start' | 'credentials' | 'otp'>('start');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.username === username && u.passwordHash === password);
    if (!user) {
      setError('Incorrect username or password');
      return;
    }
    if (!user.email) {
      setError('No email registered for this user. Please contact admin.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, fullName: user.username })
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Failed to send OTP');
      }
      setUserEmail(user.email);
      setStep('otp');
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
        body: JSON.stringify({ email: userEmail, otp })
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Invalid OTP');
      }
      
      const user = state.users.find(u => u.username === username);
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Staff/Admin Login */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
          <div className="bg-slate-800 p-8 text-white flex-grow-0">
            <div className="flex items-center gap-3 mb-2">
              <Stethoscope className="w-8 h-8 text-teal-400" />
              <h2 className="text-2xl font-bold">Clinic Staff</h2>
            </div>
            <p className="text-slate-300">Access reception dashboard and live queue control.</p>
          </div>
          <div className="p-8 flex flex-col gap-4 flex-grow justify-center">
            
            {step === 'start' ? (
              <button 
                onClick={() => setStep('credentials')}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
              >
                <UserRound className="w-5 h-5" />
                Login to Dashboard
              </button>
            ) : step === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-3">
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
                    onClick={() => { setStep('start'); setPassword(''); setUsername(''); setError(''); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-6 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Sending OTP...' : 'Login'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                <p className="text-sm text-slate-600 mb-2 text-center bg-teal-50 p-3 rounded-lg border border-teal-100">
                  Secure OTP sent to <br/><strong>{userEmail.replace(/(\\w{3})[\\w.-]+@([\\w.]+\\w)/, "$1***@$2")}</strong>
                </p>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter 6-Digit OTP"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-center tracking-widest font-mono text-xl"
                    required
                    autoFocus
                    maxLength={6}
                  />
                </div>
                {error && <p className="text-rose-500 text-sm font-medium">{error}</p>}
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-6 rounded-xl transition-all"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            )}

            <button 
              onClick={() => navigate('/tv')}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all border border-slate-200 mt-2"
            >
              <Monitor className="w-5 h-5" />
              Open Waiting Room TV
            </button>
          </div>
        </div>

        {/* Patient Access */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
          <div className="bg-teal-600 p-8 text-white flex-grow-0">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-8 h-8 text-teal-100" />
              <h2 className="text-2xl font-bold">Patient Portal</h2>
            </div>
            <p className="text-teal-50">Track your live queue status and schedule appointments.</p>
          </div>
          <div className="p-8 flex flex-col gap-4 flex-grow justify-center">
             <button 
               onClick={() => navigate('/track')}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
            >
              <Smartphone className="w-5 h-5" />
              Open Patient Tracker
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/pages/Login.tsx', loginCode);
