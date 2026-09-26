import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Monitor, Smartphone, UserRound, Lock, KeyRound, Mail, ArrowLeft, RefreshCw, CheckCircle2, Calendar } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';

export default function Login() {
  const navigate = useNavigate();
  const { state } = useClinic();
  
  const [authMode, setAuthMode] = useState<'password' | 'otp' | 'forgot'>('password');
  const [step, setStep] = useState<'start' | 'form' | 'otp' | 'reset'>('start');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 30s Countdown timer for Resend OTP
  const [resendCountdown, setResendCountdown] = useState(0);

  const maskEmail = (emailStr: string) => {
    if (!emailStr) return '';
    return emailStr.replace(/(\w{3})[\w.-]+@([\w.]+\w)/, "$1***@$2");
  };

  useEffect(() => {
    let timer: any = null;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(prev => prev - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCountdown]);

  const completeLogin = (user: any, token?: string) => {
    sessionStorage.setItem('staffAuthenticated', 'true');
    if (token) sessionStorage.setItem('staffAuthToken', token);
    sessionStorage.setItem('userRole', user.role || 'admin');
    sessionStorage.setItem('username', user.username || identifier);
    if (user.email) sessionStorage.setItem('userEmail', user.email);
    navigate('/dashboard');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!identifier.trim() || !password) {
      setError('Please enter your email or username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        completeLogin(data.user, data.token);
      } else {
        setError(data.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Login error: ' + (err.message || 'Network failure'));
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!identifier.trim()) {
      setError('Please enter your email or username');
      return;
    }

    // Lookup user in state or resolve email
    const cleanId = identifier.trim().toLowerCase();
    const user = state.users.find(u => 
      (u.email && u.email.toLowerCase() === cleanId) || 
      (u.username && u.username.toLowerCase() === cleanId)
    ) || (cleanId === 'suyash' || cleanId === 'skgservicesin@gmail.com' ? { username: 'suyash', email: 'skgservicesin@gmail.com' } : null);

    const targetEmail = user?.email || (cleanId.includes('@') ? cleanId : null);

    if (!targetEmail) {
      setError('No registered email found for this user. Please use Password Login.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, fullName: user?.username || identifier, type: 'login' })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setUserEmail(targetEmail);
      setResendCountdown(30);
      setStep('otp');
    } catch (err: any) {
      setLoading(false);
      setError(err.message + ' — You can login directly with your Password.');
      setAuthMode('password');
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || !userEmail) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (authMode === 'forgot') {
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: userEmail })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to resend code');
        setSuccessMsg(`New reset code sent to ${maskEmail(userEmail)}`);
      } else {
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, fullName: identifier, type: 'login' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');
        setSuccessMsg(`New OTP sent to ${maskEmail(userEmail)}`);
      }
      setResendCountdown(30);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return setError('Please enter the OTP');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, otp: otp.trim() })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      const user = state.users.find(u => 
        (u.email && u.email.toLowerCase() === userEmail.toLowerCase()) ||
        (u.username && u.username.toLowerCase() === identifier.trim().toLowerCase())
      ) || { username: identifier || 'suyash', role: 'admin', email: userEmail };

      completeLogin(data.user || user, data.token);
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!identifier.trim()) {
      setError('Please enter your email or username');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send password reset code');
      }

      setUserEmail(data.email || identifier.trim());
      setResendCountdown(30);
      setStep('reset');
      setSuccessMsg(`Password reset code sent to ${maskEmail(data.email || identifier)}`);
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!otp.trim()) return setError('Please enter the 6-digit reset code.');
    if (newPassword.length < 4) return setError('New password must be at least 4 characters.');

    setLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, otp: otp.trim(), newPassword })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccessMsg('Password reset successfully! Please sign in with your new password.');
      setAuthMode('password');
      setStep('form');
      setPassword('');
      setOtp('');
      setNewPassword('');
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Patient Portal Card (Left Side) */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
          <div className="bg-teal-600 p-8 text-white flex-grow-0">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-8 h-8 text-teal-100" />
              <h2 className="text-2xl font-bold">Patient Portal</h2>
            </div>
            <p className="text-teal-50">Book video consultations, track live queue, and schedule visits.</p>
          </div>
          <div className="p-8 flex flex-col gap-4 flex-grow justify-center">
            <button
              onClick={() => navigate('/book-appointment')}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm text-sm"
            >
              <Calendar className="w-4 h-4" />
              Book Online Appointment
            </button>
            <button 
              onClick={() => navigate('/track')}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm text-sm"
            >
              <Smartphone className="w-4 h-4" />
              Open Patient Tracker
            </button>
            <button
              onClick={() => navigate('/reschedule')}
              className="text-sm text-slate-500 hover:text-slate-800 font-medium underline text-center mt-1"
            >
              Reschedule Appointment
            </button>
          </div>
        </div>

        {/* Staff/Admin Login Card (Right Side) */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
          <div className="bg-slate-800 p-8 text-white flex-grow-0">
            <div className="flex items-center gap-3 mb-2">
              <Stethoscope className="w-8 h-8 text-teal-400" />
              <h2 className="text-2xl font-bold">Clinic Staff</h2>
            </div>
            <p className="text-slate-300">Access reception dashboard, patient records, and queue control.</p>
          </div>
          
          <div className="p-8 flex flex-col gap-4 flex-grow justify-center">
            
            {step === 'start' ? (
              <button 
                onClick={() => { setStep('form'); setError(''); setSuccessMsg(''); }}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm"
              >
                <UserRound className="w-5 h-5" />
                Login to Dashboard
              </button>
            ) : step === 'form' ? (
              <div>
                {/* Auth Mode Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('password'); setError(''); }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      authMode === 'password' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Password
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

                {successMsg && (
                  <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {authMode === 'password' ? (
                  <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="Email or Username"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-800 text-sm"
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
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-800 text-sm"
                        required
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setError('');
                          setSuccessMsg('');
                        }}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    
                    {error && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-lg leading-relaxed">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      <button 
                        type="button"
                        onClick={() => { setStep('start'); setError(''); setSuccessMsg(''); }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                        <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                      </button>
                    </div>
                  </form>
                ) : authMode === 'otp' ? (
                  <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="Email or Username"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-800 text-sm"
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
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                      >
                        {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                        <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Forgot Password - Step 1 */
                  <form onSubmit={handleForgotPasswordRequest} className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-slate-700 mb-1">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('password'); setError(''); }}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                      </button>
                    </div>

                    <p className="text-xs text-slate-500">
                      Enter your registered email address or username to receive a 6-digit password reset code.
                    </p>

                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="Email or Username"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-slate-800 text-sm"
                        required
                        autoFocus
                      />
                    </div>

                    {error && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-lg leading-relaxed">
                        {error}
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm flex items-center justify-center gap-2 mt-1"
                    >
                      {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>{loading ? 'Sending Code...' : 'Send Password Reset Code'}</span>
                    </button>
                  </form>
                )}
              </div>
            ) : step === 'otp' ? (
              /* Email OTP Verification Form */
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                <p className="text-sm text-slate-600 mb-2 text-center bg-teal-50 p-3 rounded-lg border border-teal-100">
                  Secure OTP sent to <br/><strong>{maskEmail(userEmail)}</strong>
                </p>

                {successMsg && (
                  <p className="text-xs text-emerald-600 font-medium text-center">{successMsg}</p>
                )}

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

                {/* Resend OTP Button with 30s Countdown */}
                <div className="flex items-center justify-between text-xs px-1">
                  <button 
                    type="button"
                    onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0 || loading}
                    className="font-semibold text-teal-600 hover:text-teal-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Resend OTP'}
                  </button>
                </div>

                {error && <p className="text-rose-500 text-xs font-medium">{error}</p>}

                <div className="flex gap-2 mt-2">
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
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Forgot Password - Step 2: Enter Code & New Password */
              <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-3">
                <p className="text-sm text-slate-600 mb-1 text-center bg-teal-50 p-2.5 rounded-lg border border-teal-100">
                  Reset code sent to <br/><strong>{maskEmail(userEmail)}</strong>
                </p>

                {successMsg && (
                  <p className="text-xs text-emerald-600 font-medium text-center">{successMsg}</p>
                )}

                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter 6-Digit Code"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-center tracking-widest font-mono text-lg text-slate-800"
                    required
                    autoFocus
                    maxLength={6}
                  />
                </div>

                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter New Password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                    required
                    minLength={4}
                  />
                </div>

                {/* Resend Code Button with 30s Countdown */}
                <div className="flex items-center justify-between text-xs px-1">
                  <button 
                    type="button"
                    onClick={() => { setStep('form'); setAuthMode('forgot'); setError(''); }}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0 || loading}
                    className="font-semibold text-teal-600 hover:text-teal-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {resendCountdown > 0 ? `Resend Code in ${resendCountdown}s` : 'Resend Code'}
                  </button>
                </div>

                {error && <p className="text-rose-500 text-xs font-medium">{error}</p>}

                <div className="flex gap-2 mt-1">
                  <button 
                    type="button"
                    onClick={() => { setStep('form'); setAuthMode('password'); setError(''); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{loading ? 'Resetting...' : 'Reset Password'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Waiting Room TV Link */}
            <button 
              onClick={() => navigate('/tv')}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all border border-slate-200 mt-2 text-sm"
            >
              <Monitor className="w-4 h-4" />
              Open Waiting Room TV
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
