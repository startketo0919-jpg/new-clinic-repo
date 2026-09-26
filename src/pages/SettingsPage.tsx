import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Save, Plus, Trash2, ShieldAlert, Send, Package, CreditCard, Video, Bell, CheckCircle2, XCircle, IndianRupee } from 'lucide-react';
import { WhatsAppTemplate } from '../types';

export default function SettingsPage() {
  const { state, updateSettings, resetDatabase, updateUserPassword, updateTemplates, sendWhatsAppMessage } = useClinic();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<string>('general');
  const [showDelhiveryUnlocked, setShowDelhiveryUnlocked] = useState(false);
  const [delhiveryConfirmInput, setDelhiveryConfirmInput] = useState('');
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [newWarehousePincode, setNewWarehousePincode] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Razorpay
  const [showRazorpayUnlocked, setShowRazorpayUnlocked] = useState(false);
  const [razorpayConfirmInput, setRazorpayConfirmInput] = useState('');

  // Google
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleStatusChecked, setGoogleStatusChecked] = useState(false);

  // Auth check and Google status
  useEffect(() => {
    const authenticated = sessionStorage.getItem('staffAuthenticated');
    if (authenticated !== 'true') {
      navigate('/login');
    }
    setUserRole(sessionStorage.getItem('userRole'));

    fetch('/api/google/status')
      .then(res => res.json())
      .then(data => {
        setGoogleConnected(data.connected);
        if (data.email) setGoogleEmail(data.email);
        setGoogleStatusChecked(true);
      })
      .catch(console.error);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google') === 'connected') {
      alert('Google Account Connected Successfully!');
      window.history.replaceState({}, '', '/settings');
    }
  }, [navigate]);

  // General Settings
  const [newPassword, setNewPassword] = useState('');
  const [adminPass, setAdminPass] = useState('');
  
  // WhatsApp Settings
  const [unlockWa, setUnlockWa] = useState('');
  const [waKey, setWaKey] = useState('');
  const [waPhone, setWaPhone] = useState('');
  
  useEffect(() => {
    setWaKey(state.settings.whatsappApiKey || '');
    setWaPhone(state.settings.whatsappPhoneId || '');
  }, [state.settings]);

  // Bulk Message
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [bulkTemplate, setBulkTemplate] = useState('');
  const [bulkLang, setBulkLang] = useState('en');

  // New Template Form
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplEvent, setTplEvent] = useState('new_patient');
  const [tplLang, setTplLang] = useState('en');
  const [tplVars, setTplVars] = useState<string[]>([]);
  const availableVars = ['Name', 'Patient ID', 'Token Number', 'Age', 'Date', 'Wait Time'];

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) return alert("Too short");
    const username = sessionStorage.getItem('username');
    if (username) {
      updateUserPassword(username, newPassword);
      alert("Password updated");
      setNewPassword('');
    }
  };

  const handleSaveWa = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ whatsappApiKey: waKey, whatsappPhoneId: waPhone });
    alert("WhatsApp Settings Saved");
    setUnlockWa('');
  };

  const handleResetDB = async () => {
    if (window.confirm("Are you sure? This deletes ALL patients and history.")) {
      const result = await resetDatabase(adminPass);
      if (result.success) {
        alert("Database Reset Successfully");
        setAdminPass('');
      } else {
        alert(result.error || "Incorrect Admin Password!");
      }
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const newTpl: WhatsAppTemplate = {
      id: crypto.randomUUID(),
      name: tplName,
      triggerEvent: tplEvent,
      languageCode: tplLang,
      variables: JSON.stringify(tplVars),
      isActive: true
    };
    updateTemplates([...(state.templates || []), newTpl]);
    setShowNewTemplate(false);
    setTplName('');
    setTplVars([]);
  };

  const deleteTemplate = (id: string) => {
    updateTemplates((state.templates || []).filter(t => t.id !== id));
  };
  
  const toggleTemplate = (id: string, currentStatus: boolean) => {
    updateTemplates((state.templates || []).map(t => t.id === id ? { ...t, isActive: !currentStatus } : t));
  };

  const handleSendBulk = async () => {
    if (!bulkTemplate || !bulkNumbers.trim()) return alert("Missing fields");
    const lines = bulkNumbers.split('\n').map(l => l.trim()).filter(l => l);
    
    let successCount = 0;
    for (const line of lines) {
      const parts = line.split(',');
      const phone = parts[0];
      const vars = parts.slice(1);
      
      const components = vars.length > 0 ? [{
        type: "body",
        parameters: vars.map(v => ({ type: "text", text: v.trim() }))
      }] : [];
      
      try {
        await sendWhatsAppMessage(phone, `[Bulk Test] ${bulkTemplate}`, bulkTemplate, bulkLang, components);
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }
    alert(`Sent ${successCount} / ${lines.length} messages.`);
  };

  if (userRole !== 'admin') {
    return <div className="p-10 text-center text-red-500">Access Denied. Admins only.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-indigo-600" />
          Clinic Settings
        </h1>
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg"
        >
          <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
        </button>
      </header>

      <div className="flex flex-1 max-w-6xl w-full mx-auto p-6 gap-8 items-start">
        <div className="w-64 flex flex-col gap-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setActiveTab('general')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>General</button>
          <button onClick={() => setActiveTab('whatsapp')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'whatsapp' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>WhatsApp API</button>
          <button onClick={() => setActiveTab('templates')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'templates' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Automated Templates</button>
          <button onClick={() => setActiveTab('email')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'email' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Email Setup</button>
          <button onClick={() => setActiveTab('delhivery')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'delhivery' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Delhivery API</button>
          <button onClick={() => setActiveTab('bulk')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'bulk' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Bulk Messages</button>
          <button onClick={() => setActiveTab('razorpay')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'razorpay' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Razorpay API</button>
          <button onClick={() => setActiveTab('fees')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${activeTab === 'fees' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><IndianRupee className="w-3.5 h-3.5" /> Fee Decider</button>
          <button onClick={() => setActiveTab('google')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'google' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Google Meet</button>
          <button onClick={() => setActiveTab('notifications')} className={`text-left px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'notifications' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Notifications</button>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
          {activeTab === 'general' && (
            <div className="max-w-md">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Security & Reset</h2>
              
              <div className="mb-8">
                <h3 className="font-semibold text-slate-700 mb-3">Change Your Password</h3>
                <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
                  <input type="password" placeholder="New Password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg w-fit px-6">Update</button>
                </form>
              </div>

              <hr className="my-8 border-slate-200" />
              
              <div>
                <h3 className="font-bold text-rose-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-slate-500 mb-4">Resetting the database will delete ALL patient records and history. This cannot be undone.</p>
                <div className="flex flex-col gap-3">
                  <input type="password" placeholder="Admin Password Required" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full px-3 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm" />
                  <button onClick={handleResetDB} disabled={!adminPass} className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors">Reset Entire Database</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="max-w-xl">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Meta WhatsApp Integration</h2>
              <p className="text-sm text-slate-500 mb-6">Configure your Cloud API connection.</p>
              
              {unlockWa !== 'CHANGE' ? (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
                  <h3 className="text-amber-800 font-semibold mb-2">Credentials Locked</h3>
                  <p className="text-sm text-amber-700 mb-4">Your API Key and Phone Number ID are currently hidden to prevent accidental edits.</p>
                  <label className="block text-sm font-medium text-amber-800 mb-1">Type "CHANGE" to unlock</label>
                  <input type="text" value={unlockWa} onChange={e => setUnlockWa(e.target.value)} className="w-full px-3 py-2 border border-amber-300 rounded-lg" />
                </div>
              ) : (
                <form onSubmit={handleSaveWa} className="flex flex-col gap-4 animate-in fade-in">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">API Key (Bearer Token)</label>
                    <input type="password" value={waKey} onChange={e => setWaKey(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number ID</label>
                    <input type="password" value={waPhone} onChange={e => setWaPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg w-full flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Save Connection
                  </button>
                  <button type="button" onClick={() => setUnlockWa('')} className="mt-2 text-sm text-slate-500 hover:text-slate-700">Cancel & Relock</button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Automated Message Triggers</h2>
                  <p className="text-sm text-slate-500">Configure which Meta Templates to send automatically based on user actions.</p>
                </div>
                <button onClick={() => setShowNewTemplate(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Template
                </button>
              </div>

              {showNewTemplate && (
                <div className="bg-indigo-50 p-6 rounded-xl mb-6 border border-indigo-100 relative">
                  <button onClick={() => setShowNewTemplate(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">×</button>
                  <h3 className="font-semibold text-indigo-900 mb-4">New Template Trigger</h3>
                  <form onSubmit={handleAddTemplate} className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">When to send?</label>
                      <select value={tplEvent} onChange={e => setTplEvent(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                        <option value="new_patient">When added to today's waiting queue</option>
                        <option value="pid_generated">When a new Patient ID (PID) is generated</option>
                        <option value="pid_generated_self">When a new PID is generated (Self Check-in)</option>
                        <option value="pid_generated_staff">When a new PID is generated (Staff Check-in)</option>
                        <option value="queue_old_self">When an OLD patient joins queue (Self Check-in)</option>
                        <option value="queue_new_self">When a NEW patient joins queue (Self Check-in)</option>
                        <option value="queue_old_staff">When an OLD patient joins queue (Staff Check-in)</option>
                        <option value="queue_new_staff">When a NEW patient joins queue (Staff Check-in)</option>
                        <option value="appointment_scheduled">When future appointment is requested</option>
                        <option value="appointment_approved">When appointment is approved for today</option>
                        <option value="next_in_queue">When patient is next in line (previous patient entered cabin)</option>
                        <option value="follow_up">When follow-up date is set</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Approved Template Name</label>
                      <input type="text" required value={tplName} onChange={e => setTplName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. welcome_message" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Language Code</label>
                      <input type="text" required value={tplLang} onChange={e => setTplLang(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. en" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Variables Setup (In order of {"{{1}}"}, {"{{2}}"}, etc)</label>
                      <div className="flex gap-2 flex-wrap mb-2">
                        {tplVars.map((v, i) => (
                          <span key={i} className="bg-white border border-slate-300 text-slate-700 text-xs px-2 py-1 rounded-md flex items-center gap-1">
                            {"{{"}{i+1}{"}}"}: {v} 
                            <button type="button" onClick={() => setTplVars(tplVars.filter((_, idx) => idx !== i))} className="text-red-500 ml-1">×</button>
                          </span>
                        ))}
                      </div>
                      <select onChange={(e) => { if(e.target.value) { setTplVars([...tplVars, e.target.value]); e.target.value=""; } }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                        <option value="">+ Add Variable...</option>
                        {availableVars.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 mt-2">
                      <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium">Save Trigger</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {(!state.templates || state.templates.length === 0) && (
                  <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    No automated templates configured. Messages will not be sent automatically.
                  </div>
                )}
                {state.templates?.map(tpl => (
                  <div key={tpl.id} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${tpl.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-slate-800">{tpl.name}</h4>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{tpl.languageCode}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{tpl.triggerEvent}</span>
                      </div>
                      <p className="text-sm text-slate-500">Variables: {JSON.parse(tpl.variables || '[]').join(', ') || 'None'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleTemplate(tpl.id, tpl.isActive)}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${tpl.isActive ? 'bg-teal-50 text-teal-700' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {tpl.isActive ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => deleteTemplate(tpl.id)} className="text-slate-400 hover:text-rose-600 p-2">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Email Setup (SMTP)</h3>
                <p className="text-sm text-slate-500 mb-6">Configure your SMTP server to send OTP emails.</p>
                
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                    <input 
                      type="text" 
                      value={state.settings.smtpHost || ''} 
                      onChange={e => updateSettings({ smtpHost: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. smtp.hostinger.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
                    <input 
                      type="text" 
                      value={state.settings.smtpPort || ''} 
                      onChange={e => updateSettings({ smtpPort: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. 465"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Username (Email)</label>
                    <input 
                      type="text" 
                      value={state.settings.smtpUser || ''} 
                      onChange={e => updateSettings({ smtpUser: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. hello@yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
                    <input 
                      type="password" 
                      value={state.settings.smtpPass || ''} 
                      onChange={e => updateSettings({ smtpPass: e.target.value })} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter SMTP password"
                      />
                    </div>
                  </div>


              <div className="mt-8 border-t border-slate-200 pt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Email Automation Rules</h3>
                <p className="text-sm text-slate-500 mb-6">Choose which events trigger an automated email to patients.</p>

                <div className="flex flex-col gap-4 max-w-xl">
                  {[
                    { key: 'emailAutoCheckIn', label: 'Check-in Successful', desc: 'Send token and check-in confirmation.' },
                    { key: 'emailAutoNextInQueue', label: 'Next in Queue', desc: 'Alert patient when they are next.' },
                    { key: 'emailAutoApptConfirmed', label: 'Appointment Confirmed', desc: 'Send confirmation when appointment is scheduled.' },
                    { key: 'emailAutoFollowUp', label: 'Follow-up Scheduled', desc: 'Notify patient of future follow-up dates.' },
                    { key: 'emailAutoNewPid', label: 'New Patient Registration', desc: 'Send welcome email with new PID details.' },
                  ].map(rule => (
                    <label key={rule.key} className="flex items-start gap-3 cursor-pointer">
                      <div className="relative flex items-center pt-1">
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                          checked={(state.settings as any)[rule.key] ?? true}
                          onChange={(e) => updateSettings({ [rule.key]: e.target.checked })}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{rule.label}</div>
                        <div className="text-sm text-slate-500">{rule.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              </div>
            </div>
          )}

{activeTab === 'delhivery' && (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Package className="w-5 h-5 text-indigo-600" /> Delhivery Courier Integration
    </h3>
    
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Live API Token</label>
        {!showDelhiveryUnlocked ? (
           <div className="flex gap-2">
             <input type="text" placeholder='Type "CHANGE" to unlock' className="flex-1 px-4 py-2 border rounded-lg text-sm" value={delhiveryConfirmInput} onChange={e => setDelhiveryConfirmInput(e.target.value)} />
             <button onClick={() => {
                if (delhiveryConfirmInput.trim().toUpperCase() === 'CHANGE') {
                  setShowDelhiveryUnlocked(true);
                  setDelhiveryConfirmInput('');
                } else {
                  alert('Please type "CHANGE" to unlock this setting.');
                }
             }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Unlock</button>
           </div>
        ) : (
           <div className="flex gap-2">
             <input type="text" value={state.settings.delhiveryApiKey || ''} onChange={e => updateSettings({ delhiveryApiKey: e.target.value })} className="flex-1 px-4 py-2 border rounded-lg text-sm" placeholder="Enter Delhivery Live API Token" />
             <button onClick={() => { setShowDelhiveryUnlocked(false); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Save</button>
           </div>
        )}
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Warehouses (Pickup Locations)</label>
        <div className="flex gap-2 mb-3">
          <input type="text" placeholder="Warehouse Name" className="flex-1 px-4 py-2 border rounded-lg text-sm" value={newWarehouseName} onChange={e => setNewWarehouseName(e.target.value)} />
          <input type="text" placeholder="Pincode" className="w-32 px-4 py-2 border rounded-lg text-sm" value={newWarehousePincode} onChange={e => setNewWarehousePincode(e.target.value)} />
          <button onClick={() => {
            if (!newWarehouseName || !newWarehousePincode) return;
            const warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');
            if (!warehouses.some((w: any) => (w.name || w) === newWarehouseName)) {
              warehouses.push({ name: newWarehouseName, pincode: newWarehousePincode });
              updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });
            }
            setNewWarehouseName('');
            setNewWarehousePincode('');
          }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Add</button>
        </div>
        <div className="space-y-2">
          {JSON.parse(state.settings.delhiveryWarehouses || '[]').map((wh: any, idx: number) => {
             const wName = typeof wh === 'string' ? wh : wh.name;
             const wPin = typeof wh === 'string' ? '' : wh.pincode;
             return (
             <div key={idx} className="flex justify-between items-center bg-white px-3 py-2 border rounded-lg text-sm shadow-sm">
               <span>{wName} {wPin ? `(${wPin})` : ''}</span>
               <button onClick={() => {
                 let warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');
                 warehouses = warehouses.filter((_: any, i: number) => i !== idx);
                 updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });
               }} className="text-red-500 hover:text-red-700 font-medium">Remove</button>
             </div>
             )
          })}
        </div>
      </div>
    </div>
  </div>
)}

          {activeTab === 'bulk' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Send Bulk Messages</h2>
              <p className="text-sm text-slate-500 mb-6">Enter mobile numbers and variable data (one per line) to blast approved templates.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                  <input type="text" value={bulkTemplate} onChange={e => setBulkTemplate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. promo_offer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                  <input type="text" value={bulkLang} onChange={e => setBulkLang(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. en" />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Data (Phone, Var1, Var2, ...)</label>
                <div className="text-xs text-slate-500 mb-2 font-mono bg-slate-100 p-2 rounded">
                  Format Example:<br/>
                  919876543210, John Doe, Tomorrow<br/>
                  919876543211, Jane Smith, Today
                </div>
                <textarea 
                  value={bulkNumbers} 
                  onChange={e => setBulkNumbers(e.target.value)} 
                  className="w-full h-64 px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="91xxxxxxxxxx, Var1, Var2"
                />
              </div>
              
              <button onClick={handleSendBulk} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg w-full flex items-center justify-center gap-2">
                <Send className="w-5 h-5" /> Send to All
              </button>
            </div>
          )}

          {activeTab === 'razorpay' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" /> Razorpay Integration
              </h3>
              
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Live API Credentials</label>
                  {!showRazorpayUnlocked ? (
                     <div className="flex gap-2">
                       <input type="text" placeholder='Type "CHANGE" to unlock' className="flex-1 px-4 py-2 border rounded-lg text-sm" value={razorpayConfirmInput} onChange={e => setRazorpayConfirmInput(e.target.value)} />
                       <button onClick={() => {
                          if (razorpayConfirmInput.trim().toUpperCase() === 'CHANGE') {
                            setShowRazorpayUnlocked(true);
                            setRazorpayConfirmInput('');
                          } else {
                            alert('Please type "CHANGE" to unlock this setting.');
                          }
                       }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Unlock</button>
                     </div>
                  ) : (
                     <div className="flex flex-col gap-3">
                       <input type="text" value={state.settings.razorpayKeyId || ''} onChange={e => updateSettings({ razorpayKeyId: e.target.value })} className="w-full px-4 py-2 border rounded-lg text-sm" placeholder="Enter Razorpay Key ID" />
                       <input type="password" value={state.settings.razorpayKeySecret || ''} onChange={e => updateSettings({ razorpayKeySecret: e.target.value })} className="w-full px-4 py-2 border rounded-lg text-sm" placeholder="Enter Razorpay Key Secret" />
                       <button onClick={() => { setShowRazorpayUnlocked(false); }} className="w-fit px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Save & Lock</button>
                     </div>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-1.5"><IndianRupee className="w-4 h-4 text-indigo-600" /> Fee Decider & Consultation Pricing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Standard Fee (₹)</label>
                      <input 
                        type="number" 
                        value={state.settings.consultationFee !== undefined ? state.settings.consultationFee / 100 : 199} 
                        onChange={e => updateSettings({ consultationFee: (parseFloat(e.target.value) || 0) * 100 })} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                        placeholder="199"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">7-Day Window Fee (₹)</label>
                      <input 
                        type="number" 
                        value={state.settings.followUpFee !== undefined ? state.settings.followUpFee / 100 : 0} 
                        onChange={e => updateSettings({ followUpFee: (parseFloat(e.target.value) || 0) * 100 })} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                        placeholder="0 (Free)"
                        min="0"
                      />
                      <span className="text-[11px] text-slate-400">Set 0 for FREE</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Window (Days)</label>
                      <input 
                        type="number" 
                        value={state.settings.followUpFreeDays || 7} 
                        onChange={e => updateSettings({ followUpFreeDays: parseInt(e.target.value, 10) || 7 })} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                        placeholder="7"
                        min="1"
                      />
                      <span className="text-[11px] text-slate-400">Default 7 days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <IndianRupee className="w-6 h-6 text-indigo-600" /> Fee Decider & Consultation Pricing
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">Configure appointment fees for normal bookings and the 7-day follow-up window.</p>
                </div>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-bold text-slate-800">Standard Consultation Fee</label>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Normal</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Charged for new appointments or appointments outside the follow-up window.</p>
                    </div>
                    <div className="relative mt-2">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-base">₹</span>
                      <input 
                        type="number" 
                        value={state.settings.consultationFee !== undefined ? state.settings.consultationFee / 100 : 199} 
                        onChange={e => updateSettings({ consultationFee: (parseFloat(e.target.value) || 0) * 100 })} 
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="199"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-bold text-slate-800">7-Day Window Fee</label>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Follow-up</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Charged within the 7-day follow-up window. Set to <strong>0 for completely FREE</strong>.</p>
                    </div>
                    <div className="relative mt-2">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-base">₹</span>
                      <input 
                        type="number" 
                        value={state.settings.followUpFee !== undefined ? state.settings.followUpFee / 100 : 0} 
                        onChange={e => updateSettings({ followUpFee: (parseFloat(e.target.value) || 0) * 100 })} 
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Follow-up Window Period (Days)</label>
                    <p className="text-xs text-slate-500 mb-3">How many days after a previous consultation/clinic visit the patient qualifies for the follow-up rate.</p>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={state.settings.followUpFreeDays || 7} 
                        onChange={e => updateSettings({ followUpFreeDays: parseInt(e.target.value, 10) || 7 })} 
                        className="w-32 px-4 py-2.5 border border-slate-200 rounded-lg text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="7"
                        min="1"
                      />
                      <span className="text-sm text-slate-600 font-medium">days from last visit</span>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
                  <h4 className="font-bold text-indigo-950 text-sm mb-2">Live Pricing Summary:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                      <span className="text-xs text-slate-500 block">Normal Appointment</span>
                      <span className="text-lg font-extrabold text-slate-800">
                        ₹{(state.settings.consultationFee !== undefined ? state.settings.consultationFee / 100 : 199)}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-indigo-100">
                      <span className="text-xs text-slate-500 block">Within {state.settings.followUpFreeDays || 7}-Day Window</span>
                      <span className="text-lg font-extrabold text-emerald-700">
                        {((state.settings.followUpFee || 0) === 0 ? 'FREE (₹0)' : '₹' + ((state.settings.followUpFee || 0) / 100))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'google' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" /> Google Meet Integration
              </h3>
              
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Connection Status</h4>
                    {googleStatusChecked ? (
                      googleConnected ? (
                        <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Connected as {googleEmail}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-600 text-sm font-medium">
                          <XCircle className="w-4 h-4" />
                          Not Connected
                        </div>
                      )
                    ) : (
                      <div className="text-sm text-slate-500">Checking status...</div>
                    )}
                  </div>
                  <div>
                    {googleConnected ? (
                      <button onClick={() => { /* Implement disconnect if needed */ alert('Please disconnect from Google Account settings.'); }} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Disconnect</button>
                    ) : (
                      <button 
                        onClick={() => { 
                          const token = sessionStorage.getItem('staffAuthToken') || '';
                          window.location.href = `/api/google/auth?token=${encodeURIComponent(token)}`; 
                        }} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Connect Google Account
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="font-semibold text-slate-700 mb-3">OAuth Credentials</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Google Client ID</label>
                      <input 
                        type="text" 
                        value={state.settings.googleOauthClientId || '715658585090-ijo4cn4qf0erak1jl2fucdstllqieosh.apps.googleusercontent.com'} 
                        onChange={e => updateSettings({ googleOauthClientId: e.target.value })} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                        placeholder="Enter Client ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Google Client Secret</label>
                      <input 
                        type="password" 
                        value={state.settings.googleOauthClientSecret || ''} 
                        onChange={e => updateSettings({ googleOauthClientSecret: e.target.value })} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                        placeholder="Enter Client Secret"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" /> Notification Emails
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Enter email addresses to receive notifications about new appointments, reschedules, and cancellations.</p>
                
                <textarea 
                  value={state.settings.notificationEmails || ''} 
                  onChange={e => updateSettings({ notificationEmails: e.target.value })} 
                  className="w-full h-32 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" 
                  placeholder="doctor@example.com, staff@example.com"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
