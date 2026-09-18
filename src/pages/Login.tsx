import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Monitor, Smartphone, UserRound, Lock, User as UserIcon, KeyRound, Mail } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';

export default function Login() {
  const navigate = useNavigate();
  const { state } = useClinic();
  
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'start' | 'form' | 'otp'>('start');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const completeLogin = (user: any) => {
    sessionStorage.setItem('staffAuthenticated', 'true');
    sessionStorage.setItem('userRole', user.role || 'admin');
    sessionStorage.setItem('username', user.username || username);
    navigate('/dashboard');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = state.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    // Check against configured users or default fallback admin
    if (user) {
      if (user.passwordHash === password || (username.toLowerCase() === 'admin' && password === 'Suyash@0919')) {
        completeLogin(user);
        return;
      }
      setError('Invalid password. Please try again.');
      return;
    }

    // Default emergency admin check
    if (username.trim().toLowerCase() === 'admin' && password === 'Suyash@0919') {
      completeLogin({ username: 'admin', role: 'admin' });
      return;
    }

    setError('Username not found');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = state.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) 
      || (username.toLowerCase() === 'admin' ? { username: 'admin', email: 'skgservicesin@gmail.com' } : null);

    if (!user) {
      setError('Username not found');
      return;
    }
    
    const targetEmail = user.email || 'skgservicesin@gmail.com';
    setLoading(true);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, fullName: user.username, type: 'login' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      setUserEmail(targetEmail);
      setStep('otp');
    } catch(err: any) {
      setError(err.message + ' — You can login directly with your Password below.');
      setAuthMode('password'); // Automatically fallback to password
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
      
      const user = state.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) 
        || { username: 'admin', role: 'admin' };
      completeLogin(user);
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
                onClick={() => setStep('form')}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
              >
                <UserRound className="w-5 h-5" />
                Login to Dashboard
              </button>
            ) : step === 'form' ? (
              <div>
                {/* Toggle Auth Mode */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('password'); setError(''); }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      authMode === 'password' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Password Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('otp'); setError(''); }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      authMode === 'otp' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email OTP
                  </button>
                </div>

                {authMode === 'password' ? (
                  <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
                    <div className="relative">
                      <UserIcon className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Username (e.g. admin)"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-800"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-800"
                        required
                      />
                    </div>
                    
                    {error && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-lg leading-relaxed">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      <button 
                        type="button"
                        onClick={() => { setStep('start'); setError(''); }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm text-sm"
                      >
                        Login Directly
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                    <div className="relative">
                      <UserIcon className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-800"
                        required
                        autoFocus
                      />
                    </div>
                    
                    {error && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-lg leading-relaxed">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      <button 
                        type="button"
                        onClick={() => { setStep('start'); setError(''); }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
                      >
                        {loading ? 'Sending OTP...' : 'Send OTP'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                <p className="text-sm text-slate-600 mb-2 text-center bg-teal-50 p-3 rounded-lg border border-teal-100">
                  Secure OTP sent to <br/><strong>{userEmail.replace(/(\w{3})[\w.-]+@([\w.]+\w)/, "$1***@$2")}</strong>
                </p>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter 6-Digit OTP"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-center tracking-widest font-mono text-xl text-slate-800"
                    required
                    autoFocus
                    maxLength={6}
                  />
                </div>
                {error && <p className="text-rose-500 text-xs font-medium">{error}</p>}
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl transition-all text-sm"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            )}

            <button 
              onClick={() => navigate('/tv')}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all border border-slate-200 mt-2 text-sm"
            >
              <Monitor className="w-4 h-4" />
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
