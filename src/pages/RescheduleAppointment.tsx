import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Phone, ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2, ChevronRight, CalendarCheck, AlertCircle } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';

type Appointment = {
  id: string;
  date: string;
  timeSlot: string;
  concern: string;
  status: string;
  maskedEmail: string;
};

type Slot = {
  time: string;
  available: boolean;
};

export default function RescheduleAppointment() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 4 is success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Step 2
  const [otp, setOtp] = useState('');
  const [rescheduleToken, setRescheduleToken] = useState('');

  // Step 3
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  useEffect(() => {
    // Generate dates for next 30 days, skipping Wednesdays (3)
    const dates = [];
    const today = startOfToday();
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, i);
      if (d.getDay() !== 3) {
        dates.push(d);
      }
    }
    setAvailableDates(dates);
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/appointments/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        if (data.appointments && data.appointments.length > 0) {
          const mapped: Appointment[] = data.appointments.map((a: any) => ({
            id: a.appointmentId || a.id,
            date: a.date,
            timeSlot: a.timeSlot,
            concern: a.healthConcern || a.concern,
            status: a.status,
            maskedEmail: a.maskedEmail
          }));
          setAppointments(mapped);
        } else {
          setError('No upcoming appointments found for this number');
          setAppointments([]);
        }
      } else {
        setError(data.error || 'Failed to lookup appointments');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Network error. Please try again.');
    }
  };

  const handleSelectAppointment = async (appt: Appointment) => {
    setSelectedAppointment(appt);
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/appointments/reschedule/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: appt.id })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setStep(2);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Network error. Please try again.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/appointments/reschedule/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: selectedAppointment.id, otp })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setRescheduleToken(data.rescheduleToken);
        setStep(3);
        // Pre-select today if possible
        if (availableDates.length > 0) {
          handleDateSelect(availableDates[0]);
        }
      } else {
        setError(data.error || 'Invalid or expired OTP');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Network error. Please try again.');
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot('');
    setAvailableSlots([]);
    setLoading(true);
    setError('');

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/api/appointments/available-slots?date=${dateStr}`);
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setAvailableSlots(data.slots || []);
      } else {
        setError(data.error || 'Failed to fetch slots');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Network error. Please try again.');
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedAppointment || !selectedDate || !selectedSlot || !rescheduleToken) return;

    setError('');
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch('/api/appointments/reschedule/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appointmentId: selectedAppointment.id, 
          rescheduleToken, 
          newDate: dateStr, 
          newTimeSlot: selectedSlot 
        })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setStep(4);
      } else {
        setError(data.error || 'Failed to reschedule appointment');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Network error. Please try again.');
    }
  };

  const resetFlow = () => {
    setStep(1);
    setPhone('');
    setAppointments([]);
    setSelectedAppointment(null);
    setOtp('');
    setRescheduleToken('');
    setSelectedDate(null);
    setSelectedSlot('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 py-12">
      <div className="w-full max-w-2xl mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#2d3b2d] rounded-full flex items-center justify-center mb-4 shadow-lg">
          <CalendarCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 text-center">Krishna Homoeopathic Clinic</h1>
        <p className="text-slate-500 mt-2 text-center">Reschedule Your Appointment</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Progress Bar */}
        <div className="flex h-1 bg-slate-100">
          <div 
            className="bg-[#2d3b2d] transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Find Appointment */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Find Your Appointment</h2>
                  <p className="text-sm text-slate-500 mt-1">Enter your registered mobile number</p>
                </div>

                <form onSubmit={handleLookup} className="flex flex-col gap-4">
                  <div>
                    <div className="relative">
                      <Phone className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Mobile Number (10 digits)"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3b2d] transition-all text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm p-3 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || phone.length !== 10}
                    className="w-full bg-[#2d3b2d] hover:bg-[#1f291f] text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Find Appointments'}
                  </button>
                </form>

                {appointments.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Upcoming Appointments</h3>
                    {appointments.map(appt => (
                      <div key={appt.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-800">{format(new Date(appt.date), 'MMM d, yyyy')} at {appt.timeSlot}</p>
                            <p className="text-sm text-slate-500">For: {appt.concern}</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                            {appt.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSelectAppointment(appt)}
                          disabled={loading}
                          className="w-full mt-2 bg-white border border-slate-200 hover:border-[#2d3b2d] hover:text-[#2d3b2d] text-slate-700 font-semibold py-2 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                        >
                          Reschedule <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Verify Identity */}
            {step === 2 && selectedAppointment && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Verify Identity</h2>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    For your security, we've sent a one-time password (OTP) to your registered email <br/>
                    <strong className="font-mono bg-emerald-100 px-1 py-0.5 rounded">{selectedAppointment.maskedEmail}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <div className="flex justify-center">
                    <input 
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full text-center tracking-[0.5em] text-2xl py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3b2d] transition-all font-mono"
                      required
                    />
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm p-3 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-[#2d3b2d] hover:bg-[#1f291f] text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 3: Choose New Time */}
            {step === 3 && selectedAppointment && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Select New Time</h2>
                  <p className="text-sm text-slate-500 mt-1">Rescheduling appointment from {format(new Date(selectedAppointment.date), 'MMM d')} at {selectedAppointment.timeSlot}</p>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Date Picker (Horizontal Scroll) */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Pick a Date
                    </h3>
                    <div className="flex overflow-x-auto pb-4 gap-2 snap-x scrollbar-hide -mx-2 px-2">
                      {availableDates.map(date => {
                        const isSelected = selectedDate && isSameDay(date, selectedDate);
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => handleDateSelect(date)}
                            className={`snap-start shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${
                              isSelected 
                                ? 'bg-[#2d3b2d] border-[#2d3b2d] text-white shadow-md' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-[#2d3b2d]'
                            }`}
                          >
                            <span className="text-xs uppercase font-semibold opacity-80">{format(date, 'EEE')}</span>
                            <span className="text-xl font-bold mt-1">{format(date, 'd')}</span>
                            <span className="text-[10px] uppercase opacity-80">{format(date, 'MMM')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <div className="min-h-[150px]">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Select Time
                      </h3>
                      
                      {loading ? (
                        <div className="flex items-center justify-center h-24">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map((slot, idx) => (
                            <button
                              key={idx}
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`py-2 px-2 text-sm font-medium rounded-xl border transition-all ${
                                !slot.available
                                  ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                  : selectedSlot === slot.time
                                  ? 'bg-[#2d3b2d] border-[#2d3b2d] text-white shadow-md'
                                  : 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-sm text-slate-500">No slots available on this date.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                  <p className="text-xs text-blue-800 text-center">
                    Note: You can reschedule free of charge up to 1 hour before your appointment.
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm p-3 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  onClick={handleConfirmReschedule}
                  disabled={loading || !selectedDate || !selectedSlot}
                  className="w-full bg-[#2d3b2d] hover:bg-[#1f291f] text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Confirm Reschedule'}
                </button>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 4 && selectedDate && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center gap-6 py-4"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Rescheduled Successfully!</h2>
                  <p className="text-slate-500 mt-2">Your appointment has been updated.</p>
                </div>

                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <div className="text-left">
                      <p className="text-xs text-slate-500 uppercase font-semibold">New Date</p>
                      <p className="font-bold text-slate-800 text-lg mt-0.5">{format(selectedDate, 'MMMM d, yyyy')}</p>
                    </div>
                    <Calendar className="w-6 h-6 text-[#2d3b2d] opacity-50" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p className="text-xs text-slate-500 uppercase font-semibold">New Time</p>
                      <p className="font-bold text-slate-800 text-lg mt-0.5">{selectedSlot}</p>
                    </div>
                    <Clock className="w-6 h-6 text-[#2d3b2d] opacity-50" />
                  </div>
                </div>

                <p className="text-sm text-slate-600">
                  A confirmation email with your updated meet link has been sent to your registered email.
                </p>

                <button 
                  onClick={resetFlow}
                  className="mt-4 text-[#2d3b2d] font-semibold hover:underline"
                >
                  Reschedule another appointment
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
