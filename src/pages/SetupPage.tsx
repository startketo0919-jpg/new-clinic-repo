import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2, Server, MessageSquare, Truck, Users, RefreshCw } from 'lucide-react';

export default function SetupPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('skgservicesin@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated as admin, jump straight to settings
  useEffect(() => {
    const auth = sessionStorage.getItem('staffAuthenticated');
    const role = sessionStorage.getItem('userRole');
    if (auth === 'true' && role === 'admin') {
      navigate('/settings');
    }
  }, [navigate]);

  const handleSetupLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please enter your Superadmin email/username and password.');
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
        sessionStorage.setItem('staffAuthenticated', 'true');
        if (data.token) sessionStorage.setItem('staffAuthToken', data.token);
        sessionStorage.setItem('userRole', 'admin');
        sessionStorage.setItem('username', data.user?.username || 'suyash');
        if (data.user?.email) sessionStorage.setItem('userEmail', data.user.email);
        
        // Take superadmin directly to settings for fresh setup
        navigate('/settings');
      } else {
        setError(data.error || 'Invalid credentials. Superadmin password does not match.');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Connection error: ' + (err.message || 'Could not reach server'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Krishna Homoeopathic Clinic</h1>
            <p className="text-xs text-slate-400">Superadmin Initial Setup & System Configuration</p>
          </div>
        </div>
        <Link to="/login" className="text-xs text-slate-400 hover:text-teal-400 transition-colors">
          Regular Staff Login &rarr;
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full my-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Left: Direct Setup Login (NO OTP REQUIRED) */}
        <div className="md:col-span-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              Fresh Setup Portal
            </span>
            <h2 className="text-2xl font-bold text-white">Superadmin Access</h2>
            <p className="text-xs text-slate-400 mt-1">
              Direct password authentication for fresh installations (bypasses email OTP so you can configure your SMTP credentials).
            </p>
          </div>

          <form onSubmit={handleSetupLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Superadmin Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="skgservicesin@gmail.com or suyash"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Superadmin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter superadmin password"
                  required
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />}
              <span>{loading ? 'Authenticating...' : 'Sign In to Settings Page'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Right: Setup Checklist & Guidance */}
        <div className="md:col-span-6 space-y-4">
          <h3 className="text-lg font-bold text-white mb-2">Fresh Installation Setup Checklist</h3>
          <p className="text-xs text-slate-400 mb-4">
            Once logged in, you will be redirected to the <strong>Settings</strong> page to complete these essential integrations:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">1. Configure SMTP Email</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hostinger SMTP host (`smtp.hostinger.com`), port 465, your email user, and password for automated OTPs and patient notifications.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">2. WhatsApp Cloud API</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter WhatsApp Business API token and phone number ID for live queue and appointment updates.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">3. Delhivery Logistics</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter your Delhivery Token and add pickup warehouses to enable automated shipping manifestation and thermal label printing.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">4. Manage Clinic Staff</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create receptionist and doctor accounts with their email addresses for daily operations.
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500 py-4 border-t border-slate-800">
        Krishna Homoeopathic Clinic • Dr. Sunil Kumar (B.H.M.S) • Direct Setup Portal
      </footer>
    </div>
  );
}
