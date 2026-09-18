import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Search, Clock, Users, ArrowLeft, UserCircle, Calendar, UserPlus, AlertCircle } from 'lucide-react';
import { getLocalTodayString, isSameDayLocal } from "../lib/dateUtils";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatWaitTime, calculateWaitTime } from '../lib/utils';
import { format } from 'date-fns';
import { VisitType } from '../types';

export default function PatientTracker() {
  const { state, addPatient, addAppointment, cancelAppointment } = useClinic();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'track' | 'checkin'>('track');
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedClinicId, setTrackedClinicId] = useState<string | null>(null);

  // Check-in form state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [visitType, setVisitType] = useState<VisitType>('Follow-up');
  const [shiftPreference, setShiftPreference] = useState<'Morning' | 'Evening'>('Morning');
  
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<null | {
    matches: any[];
    action: 'patient' | 'appointment' | 'search';
  }>(null);

  const availableDates = React.useMemo(() => {
    const dates = [];
    let d = new Date();
    while (dates.length < 14) {
      if (d.getDay() !== 3) {
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        dates.push(dateStr);
      }
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, []);

  const [visitDate, setVisitDate] = useState<string>(availableDates[0]);

  const [checkInSuccess, setCheckInSuccess] = useState(false);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    
    // Exact match for Clinic ID
    const exactIdMatch = state.patientRegistry.find(p => p.clinicId.toLowerCase() === query);
    if (exactIdMatch) {
      setTrackedClinicId(exactIdMatch.clinicId);
      return;
    }

    // Match by phone number
    const phoneMatches = state.patientRegistry.filter(p => p.phone === query);
    
    if (phoneMatches.length === 1) {
      setTrackedClinicId(phoneMatches[0].clinicId);
    } else if (phoneMatches.length > 1) {
      setDuplicatePrompt({
        matches: phoneMatches,
        action: 'search'
      });
    } else {
      alert("No patient record found for this phone number or Clinic ID.");
    }
  };

    const executeCheckIn = (explicitClinicId?: string) => {
    const generatedId = addAppointment({
      email,
      fullName,
      phone,
      age: parseInt(age, 10),
      gender,
      visitType,
      shiftPreference,
      date: visitDate
    }, explicitClinicId, 'self');
    
    setCheckInSuccess(true);
    setTimeout(() => {
      setCheckInSuccess(false);
      setSearchQuery(generatedId);
      setActiveTab('track');
      setTrackedClinicId(generatedId);
    }, 2000);
    setFullName('');
    setEmail('');
    setOtp('');
    setShowOtpStep(false);
    setOtpError('');
    setPhone('');
    setAge('');
    setGender('Male');
    setVisitType('Follow-up');
    setVisitDate(availableDates[0]);
    setDuplicatePrompt(null);
  };

  const handleCheckIn = async (e: React.FormEvent) => {
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
          body: JSON.stringify({ email, fullName })
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
    }

    const todayStr = getLocalTodayString();
    
    const matchingRecords = state.patientRegistry.filter(r => r.phone === phone);
    
    if (matchingRecords.length > 0) {
      // Check for exact name match
      const exactMatch = matchingRecords.find(r => r.fullName.toLowerCase() === fullName.toLowerCase());
      if (exactMatch) {
         executeCheckIn(exactMatch.clinicId);
         return;
      }
      
      // Name is different, prompt user
      setDuplicatePrompt({
        matches: matchingRecords,
        action: visitDate === todayStr ? 'patient' : 'appointment'
      });
      return;
    }

    executeCheckIn();
  };

  const patientRecord = state.patientRegistry.find(p => p.clinicId === trackedClinicId);
  const todayStr = getLocalTodayString();
  const activeVisit = state.patients.find(p => p.clinicId === trackedClinicId && p.status !== 'Skipped' && p.status !== 'Completed' && isSameDayLocal(p.checkInTime, todayStr));
  const patientAppointments = state.appointments.filter(a => a.clinicId === trackedClinicId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pendingToday = patientAppointments.find(a => a.date === todayStr);
  const todaysPatients = state.patients.filter(p => isSameDayLocal(p.checkInTime, todayStr));
  const waitingPatients = todaysPatients.filter(p => p.status === 'Waiting');
  
  let position = -1;
  let estimatedTime = 0;
  let statusColor = 'text-slate-500';
  let statusBg = 'bg-slate-50 border-slate-200';
  let statusMessage = '';

  if (activeVisit) {
    if (activeVisit.status === 'In Room') {
      statusColor = 'text-teal-600';
      statusBg = 'bg-teal-50 border-teal-200';
      statusMessage = "You're currently with the doctor.";
    } else {
      position = waitingPatients.findIndex(p => p.id === activeVisit.id);
      if (position === 0) {
        statusColor = 'text-rose-600';
        statusBg = 'bg-rose-50 border-rose-200';
        statusMessage = "You're next in line! Head to the waiting area.";
      } else if (position > 0 && position <= 2) {
        statusColor = 'text-amber-600';
        statusBg = 'bg-amber-50 border-amber-200';
        statusMessage = "Almost there. Please be nearby.";
      } else if (position > 2) {
        statusColor = 'text-emerald-600';
        statusBg = 'bg-emerald-50 border-emerald-200';
        statusMessage = "Relax, you have plenty of time.";
      }
      
      // Calculate Wait Time correctly using the logic added in utils
      estimatedTime = calculateWaitTime(waitingPatients, position);
      const elapsed = Math.floor((Date.now() - activeVisit.checkInTime) / 60000);
      estimatedTime = Math.max(0, estimatedTime - elapsed);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <header className="w-full bg-teal-600 text-white p-4 shadow-md flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/login')} className="p-2 -ml-2 rounded-full hover:bg-teal-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold tracking-wide">Patient Portal</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 w-full max-w-md p-6 flex flex-col pt-8">
        {!trackedClinicId && (
          <div className="flex bg-slate-200 rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('track')}
              className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors", activeTab === 'track' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Track Status
            </button>
            <button
              onClick={() => setActiveTab('checkin')}
              className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors", activeTab === 'checkin' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Self Check-in
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!trackedClinicId && activeTab === 'track' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
                  <Search className="w-8 h-8 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Track Your Status</h2>
                <p className="text-slate-500 text-sm">Enter your Phone Number or Clinic ID.</p>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="e.g. 9876543210 or PID-0001"
                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg transition-all"
                />
                <button 
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-2xl shadow-md transition-all active:scale-[0.98]"
                >
                  Track Now
                </button>
              </form>
            </motion.div>
          )}

          {!trackedClinicId && activeTab === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Self Check-In</h2>
                <p className="text-slate-500 text-sm">Request an appointment or same-day token.</p>
              </div>
              <form onSubmit={handleCheckIn} className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-4">
                {checkInSuccess && (
                  <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    Request submitted! Fetching your ID...
                  </div>
                )}
                
                
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    required 
                    pattern="[0-9]{10}"
                    title="10-digit phone number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="10 digits"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                    <input 
                      type="number" 
                      required 
                      min="1" max="120"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                    <select 
                      value={gender} 
                      onChange={e => setGender(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Visit Type</label>
                  <select 
                    value={visitType} 
                    onChange={e => setVisitType(e.target.value as VisitType)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  >
                    <option value="New">New Visit</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Report Review">Report Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <select 
                    value={visitDate} 
                    onChange={e => setVisitDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  >
                    {availableDates.map(d => (
                      <option key={d} value={d}>
                        {d === getLocalTodayString() ? 'Today' : format(new Date(d), 'MMM d, yyyy')}
                      </option>
                    ))}
                  </select>
                </div>
                
                
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
                    
                  </div>
                )}
                
                {otpError && <div className="text-red-500 text-sm font-medium mb-2 p-3 bg-red-50 border border-red-100 rounded-lg">{otpError}</div>}
                <button 
                  type="submit"
                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  {showOtpStep ? "Verify OTP & Submit" : "Submit Request"}
                </button>

              </form>
            </motion.div>
          )}

          {trackedClinicId && patientRecord && (
            <motion.div
              key="details"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full"
            >
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-teal-500"></div>
                
                <div className="flex items-start justify-between mb-6 pt-2">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{patientRecord.fullName}</h2>
                    <p className="text-slate-500 font-mono mt-1 text-sm bg-slate-100 inline-block px-2 py-0.5 rounded">
                      {patientRecord.clinicId}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-bold text-xl border border-teal-100">
                    {patientRecord.fullName.charAt(0).toUpperCase()}
                  </div>
                </div>

                {activeVisit ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                        <p className="text-sm font-medium text-slate-500 mb-1">Token Number</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{activeVisit.token}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                        <p className="text-sm font-medium text-slate-500 mb-1">Wait Time</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">
                          {activeVisit.status === 'In Room' ? '--' : formatWaitTime(estimatedTime)}
                        </p>
                      </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl border flex items-center gap-3", statusBg)}>
                      <Clock className={cn("w-6 h-6", statusColor)} />
                      <p className={cn("font-medium", statusColor)}>{statusMessage}</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-500 flex flex-col items-center mt-2">
                    <Calendar className="w-12 h-12 text-slate-300 mb-3" />
                    {pendingToday ? (
                      <>
                        <p className="font-medium text-slate-700">Pending Approval for Today</p>
                        <p className="text-sm mt-1 mb-4 text-slate-500">Your self check-in is pending approval from reception. You will be assigned a token shortly.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-slate-700">No Active Visit Today</p>
                        <p className="text-sm mt-1 mb-4 text-slate-500">If you are at the clinic, please check in at reception or via self check-in.</p>
                        <button 
                          onClick={() => {
                            setTrackedClinicId(null);
                            setActiveTab('checkin');
                            setPhone(patientRecord.phone);
                            setFullName(patientRecord.fullName);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          Check In Now
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {patientAppointments.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-600" /> Upcoming Appointments
                  </h3>
                  <div className="flex flex-col gap-3">
                    {patientAppointments.map(app => (
                      <div key={app.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">
                            {format(new Date(app.date), 'MMM d, yyyy')}
                            {app.shiftPreference && <span className="text-teal-600 ml-2 text-sm">({app.shiftPreference})</span>}
                          </p>
                          <p className="text-sm text-slate-500">{app.visitType}</p>
                        </div>
                        
                        {confirmCancelId === app.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-rose-600 font-medium">Sure?</span>
                            <button 
                              onClick={() => {
                                cancelAppointment(app.id);
                                setConfirmCancelId(null);
                              }}
                              className="px-3 py-1 bg-rose-600 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                              Yes
                            </button>
                            <button 
                              onClick={() => setConfirmCancelId(null)}
                              className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmCancelId(app.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        )}

                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {duplicatePrompt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-800">Verify Identity</h3>
            </div>
            <p className="text-slate-600 mb-4">
              The phone number <strong>{phone}</strong> is registered under different names. Which one is you?
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              {duplicatePrompt.matches.map(m => (
                <button
                  key={m.clinicId}
                  onClick={() => {
                    setDuplicatePrompt(null);
                    setFullName(m.fullName);
                    executeCheckIn(m.clinicId);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                    {m.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{m.fullName}</div>
                    <div className="text-sm text-slate-500">ID: {m.clinicId}</div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  setDuplicatePrompt(null);
                  executeCheckIn();
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">None of these</div>
                  <div className="text-sm text-slate-500">Create new profile as {fullName}</div>
                </div>
              </button>
            </div>
            <button
              onClick={() => setDuplicatePrompt(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
