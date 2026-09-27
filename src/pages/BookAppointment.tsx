import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, User, Calendar, CreditCard, CheckCircle2, 
  Upload, X, ChevronRight, ChevronLeft, Video, 
  Phone, History, FileText, MapPin, Truck, IndianRupee,
  CalendarDays, Clock, Download, ExternalLink, RefreshCw, AlertCircle,
  Lock, Sparkles, UserPlus, Users, Search
} from 'lucide-react';
import { format, addDays, isBefore, isSameDay, getDay, parseISO } from 'date-fns';

// Types
interface PatientProfile {
  pid: string;
  name: string;
  age: number | null;
  gender: string;
  email: string;
  isFollowUpEligible: boolean;
  followUpDaysRemaining: number;
  lastVisitDate: string | null;
  lastHealthConcern: string | null;
  lastHealthConcernDetail: string | null;
  activeAppointment: {
    id: string;
    date: string;
    timeSlot: string;
    healthConcern: string;
    status: string;
  } | null;
}

interface FormData {
  patientName: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  isExisting: boolean;
  pid?: string;
  shortAddress: string;
  lastVisitDate: string;
  hasVisitedClinicForConcern: boolean | null;
  
  isSameConcern?: boolean;
  isBookingForDifferentPerson?: boolean;
  selectedProfilePid?: string | null;
  
  healthConcern: string;
  healthConcernOther: string;
  hasReports: boolean;
  reports: File[];
  needsCourier: boolean;
  courierAddress: string;
  courierPhone: string;
  courierPincode: string;
  
  paymentMethod: string;
  paymentStatus: string;
  orderId: string;
  appointmentId: string;
  
  appointmentDate: string;
  appointmentTime: string;
}

const HEALTH_CONCERNS = [
  'Skin Allergies & Eczema', 'Hair Fall & Scalp Issues', 'Digestive Disorders', 
  'Respiratory Problems', 'Joint Pain & Arthritis', 'Migraine & Headaches', 
  'Thyroid Disorders', 'PCOD / Hormonal Issues', 'Anxiety & Stress', 
  'Child Health Issues', 'Chronic Fatigue', 'Other'
];

export default function BookAppointment() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    isExisting: false,
    pid: '',
    shortAddress: '',
    lastVisitDate: '',
    hasVisitedClinicForConcern: null,
    
    isSameConcern: undefined,
    isBookingForDifferentPerson: false,
    selectedProfilePid: null,
    
    healthConcern: '',
    healthConcernOther: '',
    hasReports: false,
    reports: [],
    needsCourier: false,
    courierAddress: '',
    courierPhone: '',
    courierPincode: '',
    
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    orderId: '',
    appointmentId: '',
    
    appointmentDate: '',
    appointmentTime: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Patient profiles from phone lookup
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesFetched, setProfilesFetched] = useState(false);
  
  // Pricing config
  const [pricingConfig, setPricingConfig] = useState<{
    normalFee: number;
    followUpFee: number;
    followUpDays: number;
  }>({
    normalFee: 199,
    followUpFee: 0,
    followUpDays: 15,
  });

  // Step 4: Slots
  const [availableSlots, setAvailableSlots] = useState<{morning: string[], evening: string[]}>({
    morning: ['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM'],
    evening: ['05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM']
  });
  
  // Final Confirmation Data
  const [confirmationData, setConfirmationData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateForm = (key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  // ---------------------------------------------------------------
  // SELECTED PROFILE DERIVED STATE
  // ---------------------------------------------------------------
  const selectedProfile = useMemo(() => {
    if (!formData.selectedProfilePid) return null;
    return profiles.find(p => p.pid === formData.selectedProfilePid) || null;
  }, [profiles, formData.selectedProfilePid]);

  const isFollowUpEligible = selectedProfile?.isFollowUpEligible === true;
  const isFollowUp = isFollowUpEligible && formData.isSameConcern !== false;
  const effectiveFee = isFollowUp ? pricingConfig.followUpFee : pricingConfig.normalFee;
  const isFree = isFollowUp && pricingConfig.followUpFee === 0;

  // ---------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------
  const formatDateSafe = (d: any) => {
    if (!d) return '—';
    try {
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return format(parseISO(d.substring(0, 10)), 'MMM d, yyyy');
      return format(new Date(d), 'MMM d, yyyy');
    } catch { return String(d); }
  };

  const formatTimeSlotSafe = (t: any) => {
    if (!t) return '';
    try {
      const parts = String(t).split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1] || '0', 10);
      if (isNaN(h)) return String(t);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${displayHour}:${String(m || 0).padStart(2, '0')} ${ampm}`;
    } catch { return String(t); }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Confirmed</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Completed</span>;
      case 'rescheduled':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Rescheduled</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{status || 'Booked'}</span>;
    }
  };

  // ---------------------------------------------------------------
  // PHONE LOOKUP: Fetch profiles when phone = 10 digits
  // ---------------------------------------------------------------
  useEffect(() => {
    if (formData.phone.length === 10 && /^[6-9]\d{9}$/.test(formData.phone)) {
      fetchProfiles(formData.phone);
    } else {
      setProfiles([]);
      setProfilesFetched(false);
    }
  }, [formData.phone]);

  const fetchProfiles = async (phone: string) => {
    setProfilesLoading(true);
    setProfilesFetched(false);
    try {
      const res = await fetch('/api/appointments/profiles-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        setPricingConfig({
          normalFee: data.normalFee ?? 199,
          followUpFee: data.followUpFee ?? 0,
          followUpDays: data.followUpDays ?? 15,
        });
      }
    } catch (e) {
      console.error('Failed to fetch profiles:', e);
    } finally {
      setProfilesLoading(false);
      setProfilesFetched(true);
    }
  };

  // ---------------------------------------------------------------
  // PROFILE SELECTION
  // ---------------------------------------------------------------
  const selectProfile = (profile: PatientProfile) => {
    setFormData(prev => ({
      ...prev,
      selectedProfilePid: profile.pid,
      patientName: profile.name,
      age: profile.age ? String(profile.age) : '',
      gender: profile.gender || '',
      email: profile.email || prev.email,
      pid: profile.pid,
      isExisting: true,
      isBookingForDifferentPerson: false,
      isSameConcern: undefined, // Reset - will be asked in follow-up decision
    }));
    setError('');
  };

  const selectNewPid = () => {
    setFormData(prev => ({
      ...prev,
      selectedProfilePid: '__new__',
      patientName: '',
      age: '',
      gender: '',
      email: prev.email,
      pid: '',
      isExisting: false,
      isBookingForDifferentPerson: true,
      isSameConcern: undefined,
      hasVisitedClinicForConcern: null,
    }));
    setError('');
  };

  const nextStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(prev => prev + 1);
  };
  
  const prevStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(prev => prev - 1);
  };

  // ---------------------------------------------------------------
  // STEP 1 VALIDATION & HANDLER
  // ---------------------------------------------------------------
  const validateStep1 = () => {
    if (!formData.phone.match(/^[6-9]\d{9}$/)) return 'Valid 10-digit mobile number required';
    if (!profilesFetched) return 'Please wait for patient lookup to complete';

    // Must have selected a profile or new PID
    if (profiles.length > 0 && !formData.selectedProfilePid) {
      return 'Please select a patient profile or click "Create New Patient"';
    }

    if (!formData.patientName.trim()) return 'Patient Name is required';
    const ageNum = parseInt(String(formData.age), 10);
    if (!formData.age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return 'Please enter a valid age (1-120)';
    }
    if (!formData.gender) return 'Please select patient gender';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Valid email required';

    // Check active appointment for selected profile
    if (selectedProfile?.activeAppointment) {
      return `An active appointment already exists for "${selectedProfile.name}" (${selectedProfile.activeAppointment.status}). Please reschedule instead.`;
    }

    // For new PID: check name doesn't conflict with active profile
    if (formData.selectedProfilePid === '__new__' && profiles.length > 0) {
      const trimmedName = formData.patientName.trim().toLowerCase();
      const nameConflict = profiles.find(p => 
        p.name.trim().toLowerCase() === trimmedName && p.activeAppointment
      );
      if (nameConflict) {
        return `An active appointment exists for "${nameConflict.name}". Please enter a different name or reschedule.`;
      }
    }

    // Follow-up decision required if eligible
    if (isFollowUpEligible && selectedProfile?.lastHealthConcern && formData.isSameConcern === undefined) {
      return 'Please choose whether this consultation is for the same health concern or a new case.';
    }

    // Clinic records inquiry
    if (formData.hasVisitedClinicForConcern === true) {
      if (!formData.shortAddress.trim()) return 'Short address from clinic records is required';
      if (!formData.lastVisitDate) return 'Approximate last visit date/month is required';
    }

    return null;
  };

  const onNextStep1 = () => {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    // Auto-fill courier phone if empty
    if (!formData.courierPhone) {
      updateForm('courierPhone', formData.phone);
    }
    // Prefill health concern if follow-up same concern
    if (isFollowUp && selectedProfile?.lastHealthConcern) {
      updateForm('healthConcern', selectedProfile.lastHealthConcern);
      if (selectedProfile.lastHealthConcernDetail) {
        updateForm('healthConcernOther', selectedProfile.lastHealthConcernDetail);
      }
    }
    nextStep();
  };

  // ---------------------------------------------------------------
  // STEP 2 HANDLERS
  // ---------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = formData.reports.length + newFiles.length;
      if (totalFiles > 5) {
        setError('Maximum 5 files allowed.');
        return;
      }
      
      let totalSize = formData.reports.reduce((acc, f) => acc + f.size, 0);
      for (const f of newFiles) {
        totalSize += f.size;
      }
      if (totalSize > 20 * 1024 * 1024) {
        setError('Total file size exceeds 20 MB.');
        return;
      }
      
      setError('');
      updateForm('reports', [...formData.reports, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newReports = [...formData.reports];
    newReports.splice(index, 1);
    updateForm('reports', newReports);
  };

  const validateStep2 = () => {
    let currentConcern = formData.healthConcern;
    if (isFollowUp && selectedProfile?.lastHealthConcern) {
      if (!currentConcern) {
        currentConcern = selectedProfile.lastHealthConcern;
        updateForm('healthConcern', selectedProfile.lastHealthConcern);
        if (selectedProfile.lastHealthConcernDetail) {
          updateForm('healthConcernOther', selectedProfile.lastHealthConcernDetail);
        }
      }
    }
    if (!currentConcern) return 'Please select a health concern';
    if (currentConcern === 'Other' && !formData.healthConcernOther.trim()) {
      return 'Please specify your health concern';
    }
    if (formData.needsCourier) {
      if (!formData.courierAddress.trim()) return 'Courier address is required';
      if (!formData.courierPhone.match(/^[6-9]\d{9}$/)) return 'Valid courier phone required';
      if (!formData.courierPincode.match(/^\d{6}$/)) return 'Valid 6-digit pincode required';
    }
    return null;
  };

  const onNextStep2 = () => {
    const err = validateStep2();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    nextStep();
  };

  // ---------------------------------------------------------------
  // STEP 3 HANDLERS
  // ---------------------------------------------------------------
  const handlePayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Create Order
      const orderRes = await fetch('/api/appointments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientName: formData.patientName,
          age: Number(formData.age),
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email,
          patientType: formData.isExisting ? 'existing' : 'new',
          shortAddress: formData.shortAddress,
          lastVisitDate: formData.lastVisitDate,
          pid: formData.pid || undefined,
          isSameConcern: formData.isSameConcern !== false,
          healthConcern: formData.healthConcern === 'Other' ? 'Other' : formData.healthConcern,
          healthConcernDetail: formData.healthConcernOther,
          wantsCourierMedicine: formData.needsCourier,
          courierAddress: formData.courierAddress,
          courierContact: formData.courierPhone,
          courierPincode: formData.courierPincode
        })
      });
      
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create appointment');
      }

      const currentApptId = orderData.appointmentId;
      updateForm('appointmentId', currentApptId);
      
      // Upload reports if any
      if (formData.hasReports && formData.reports.length > 0 && currentApptId) {
        const formDataPayload = new FormData();
        formDataPayload.append('appointmentId', currentApptId);
        formData.reports.forEach(file => {
          formDataPayload.append('reports', file);
        });
        
        await fetch('/api/appointments/upload-reports', {
          method: 'POST',
          body: formDataPayload
        }).catch(err => console.error("Upload error:", err));
      }

      if (orderData.isFree || isFree || effectiveFee === 0) {
        // Free follow-up -> auto advance
        updateForm('paymentStatus', 'completed');
        setLoading(false);
        nextStep();
        return;
      }

      // Ensure Razorpay SDK is loaded
      const loadRazorpay = (): Promise<boolean> => {
        return new Promise(resolve => {
          if ((window as any).Razorpay) return resolve(true);
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded || !(window as any).Razorpay) {
        throw new Error('Could not load payment gateway. Please check your internet connection.');
      }

      // Initialize Razorpay
      const options = {
        key: orderData.keyId || 'rzp_test_dummy',
        amount: orderData.amount || effectiveFee * 100,
        currency: 'INR',
        name: 'Krishna Homoeopathic Clinic',
        description: isFollowUp ? 'Online Follow-up Consultation' : 'Online Video Consultation',
        order_id: orderData.orderId,
        prefill: {
          name: formData.patientName,
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: '#0d9488'
        },
        handler: async function (response: any) {
          // Verify payment
          try {
            const vRes = await fetch('/api/appointments/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                appointmentId: currentApptId
              })
            });
            const vData = await vRes.json();
            if (!vRes.ok) {
              throw new Error(vData.error || 'Payment verification failed');
            }
            updateForm('paymentStatus', 'completed');
            nextStep();
          } catch (err: any) {
            setError(err.message || 'Payment verification failed. Please contact support.');
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(response.error.description || 'Payment failed');
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Error processing request');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------
  // STEP 4 HANDLERS
  // ---------------------------------------------------------------
  // Generate next 30 days
  const today = new Date();
  const dateOptions = Array.from({ length: 30 }).map((_, i) => {
    const d = addDays(today, i);
    return {
      date: d,
      dateStr: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEE'),
      dayNum: format(d, 'd'),
      isClosed: getDay(d) === 3 // Wednesday = 3
    };
  });

  const fetchSlots = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/available-slots?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        const slots: Array<{ time: string; end: string; label: string; available: boolean }> = data.slots || [];
        
        const morning = slots
          .filter(s => {
            const hour = parseInt(s.time.split(':')[0], 10);
            return hour < 15 && s.available;
          })
          .map(s => s.time);
          
        const evening = slots
          .filter(s => {
            const hour = parseInt(s.time.split(':')[0], 10);
            return hour >= 15 && s.available;
          })
          .map(s => s.time);

        setAvailableSlots({ morning, evening });
      }
    } catch (err) {
      console.error(err);
      // Fallback slots
      setAvailableSlots({
        morning: ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30'],
        evening: ['17:30', '18:00', '18:30', '19:00', '19:30']
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.appointmentDate) {
      fetchSlots(formData.appointmentDate);
      updateForm('appointmentTime', ''); // Reset time on date change
    }
  }, [formData.appointmentDate]);

  const handleBookSlot = async () => {
    if (!formData.appointmentDate || !formData.appointmentTime) {
      setError('Please select a date and time slot.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/appointments/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appointmentId: formData.appointmentId,
          date: formData.appointmentDate,
          timeSlot: formData.appointmentTime
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to book slot');
      }
      
      setConfirmationData({
        appointmentId: data.appointmentId || formData.appointmentId,
        patientId: data.clinicId || 'PT-XXXX',
        meetLink: data.meetLink || 'https://meet.google.com/',
        date: data.date || formData.appointmentDate,
        time: data.timeSlot || formData.appointmentTime
      });
      
      setStep(5); // Success step
    } catch (err: any) {
      setError(err.message || 'Error booking appointment');
    } finally {
      setLoading(false);
    }
  };

  const generateICS = () => {
    if (!confirmationData) return;
    
    const dateStr = confirmationData.date.replace(/-/g, '');
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${dateStr}T110000Z
DTEND:${dateStr}T113000Z
SUMMARY:Online Consultation - Dr. Sunil Kumar
DESCRIPTION:Krishna Homoeopathic Clinic\\nAppointment ID: ${confirmationData.appointmentId}
LOCATION:Google Meet - ${confirmationData.meetLink}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'appointment.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-800">
            <Stethoscope className="w-6 h-6" />
            <h1 className="font-bold text-lg hidden sm:block">Krishna Homoeopathic Clinic</h1>
            <h1 className="font-bold text-lg sm:hidden">KHC</h1>
          </div>
          {step < 5 && (
            <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Step {step} of 4
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Progress Bar */}
        {step < 5 && (
          <div className="mb-8">
            <div className="flex justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 rounded-full z-0"></div>
              <div 
                className="absolute top-1/2 left-0 h-1 bg-teal-500 -translate-y-1/2 rounded-full z-0 transition-all duration-500"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              ></div>
              
              {[1, 2, 3, 4].map(num => (
                <div key={num} className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  step >= num ? 'bg-teal-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}>
                  {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-slate-500">
              <span className="text-center w-8">Details</span>
              <span className="text-center w-8">Health</span>
              <span className="text-center w-8">Pay</span>
              <span className="text-center w-8">Slot</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ------------------------------------------------------------- */}
            {/* STEP 1: PATIENT DETAILS - MOBILE FIRST */}
            {/* ------------------------------------------------------------- */}
            {step === 1 && (
              <motion.div 
                key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                className="p-6 sm:p-8"
              >
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-6 h-6 text-teal-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Book Online Video Consultation</h2>
                  <p className="text-slate-500 mt-2 text-sm">Fill in your details to consult Dr. Sunil Kumar from the comfort of your home.</p>
                </div>

                {error && <div className="mb-6 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm">{error}</div>}

                <div className="space-y-5">
                  {/* FIELD 1: Mobile Number (FIRST) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="tel" maxLength={10}
                        value={formData.phone} onChange={e => updateForm('phone', e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile number"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg tracking-wide"
                      />
                    </div>
                  </div>

                  {/* PROFILES LOADING */}
                  {formData.phone.length === 10 && profilesLoading && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-teal-700">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Looking up patient records...</span>
                    </div>
                  )}

                  {/* PROFILES FOUND: Show patient selection cards */}
                  {profilesFetched && profiles.length > 0 && !profilesLoading && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-teal-600" />
                        <label className="text-sm font-semibold text-slate-700">
                          {profiles.length} patient{profiles.length > 1 ? 's' : ''} found on this number — select who is consulting:
                        </label>
                      </div>

                      {profiles.map(profile => {
                        const isSelected = formData.selectedProfilePid === profile.pid;
                        return (
                          <button
                            key={profile.pid}
                            type="button"
                            onClick={() => selectProfile(profile)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                              isSelected 
                                ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600 shadow-sm' 
                                : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-800">{profile.name}</span>
                                  <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                    {profile.pid}
                                  </span>
                                  {profile.isFollowUpEligible && (
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" /> Follow-up Window
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                  {profile.age && <span>{profile.age} yrs</span>}
                                  {profile.gender && <span>• {profile.gender}</span>}
                                  {profile.lastVisitDate && (
                                    <span>• Last visit: {formatDateSafe(profile.lastVisitDate)}</span>
                                  )}
                                </div>
                                {profile.lastHealthConcern && (
                                  <div className="text-xs text-slate-600 mt-1">
                                    Last concern: <strong>{profile.lastHealthConcern}</strong>
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                                }`}>
                                  {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                                </span>
                              </div>
                            </div>
                            {/* Active appointment warning */}
                            {profile.activeAppointment && (
                              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <span>
                                  Active appointment on {formatDateSafe(profile.activeAppointment.date)} at {formatTimeSlotSafe(profile.activeAppointment.timeSlot)} — 
                                  <Link to={`/reschedule?phone=${formData.phone}&appointmentId=${profile.activeAppointment.id}`} className="font-bold underline ml-1">Reschedule</Link>
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {/* Create New Patient option */}
                      <button
                        type="button"
                        onClick={selectNewPid}
                        className={`w-full text-left p-4 rounded-xl border-2 border-dashed transition-all ${
                          formData.selectedProfilePid === '__new__'
                            ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600 shadow-sm'
                            : 'border-slate-300 bg-slate-50/50 hover:border-teal-400 hover:bg-teal-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${formData.selectedProfilePid === '__new__' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">Create New Patient (Family / Relative)</span>
                            <p className="text-xs text-slate-500 mt-0.5">Book for someone not listed above — a new PID will be assigned.</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* NO PROFILES: New patient on this number */}
                  {profilesFetched && profiles.length === 0 && !profilesLoading && formData.phone.length === 10 && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-teal-600 flex-shrink-0" />
                      <span>New patient on this mobile number. Please fill in your details below.</span>
                    </div>
                  )}

                  {/* PATIENT DETAILS FIELDS - shown when profile selected OR no profiles found */}
                  {((formData.selectedProfilePid) || (profilesFetched && profiles.length === 0 && formData.phone.length === 10)) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pt-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name *</label>
                        <div className="relative">
                          <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            value={formData.patientName} 
                            onChange={e => updateForm('patientName', e.target.value)}
                            readOnly={formData.selectedProfilePid !== '__new__' && formData.selectedProfilePid !== null && profiles.length > 0}
                            placeholder="Full Name"
                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              formData.selectedProfilePid !== '__new__' && formData.selectedProfilePid !== null && profiles.length > 0 ? 'bg-slate-100 text-slate-700 cursor-default' : ''
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Age (Years) *</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="120"
                            value={formData.age} 
                            onChange={e => updateForm('age', e.target.value)}
                            placeholder="e.g. 28"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                          <select 
                            value={formData.gender} 
                            onChange={e => updateForm('gender', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                        <div className="relative">
                          <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="email"
                            value={formData.email} onChange={e => updateForm('email', e.target.value)}
                            placeholder="email@example.com"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      {/* -------- FOLLOW-UP DECISION (only if selected profile is eligible) -------- */}
                      {isFollowUpEligible && selectedProfile?.lastHealthConcern && (
                        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-800 mt-0.5 flex-shrink-0">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                                  {pricingConfig.followUpDays}-Day Follow-Up Window
                                </span>
                                {formData.pid && (
                                  <span className="text-xs font-mono font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                    PID: {formData.pid}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-slate-900 mt-2 text-sm sm:text-base">
                                Your last completed consultation was on {formatDateSafe(selectedProfile.lastVisitDate)} for:
                              </h3>
                              <p className="text-sm text-emerald-950 mt-1 font-bold">
                                "{selectedProfile.lastHealthConcern}"
                                {selectedProfile.lastHealthConcernDetail ? ` (${selectedProfile.lastHealthConcernDetail})` : ''}
                              </p>
                              <p className="text-xs text-slate-600 mt-2">
                                Is this appointment regarding the <strong>same recorded concern</strong> or a <strong>new case</strong> for a different concern?
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Same Concern */}
                            <button
                              type="button"
                              onClick={() => {
                                updateForm('isSameConcern', true);
                                updateForm('healthConcern', selectedProfile.lastHealthConcern);
                                updateForm('healthConcernOther', selectedProfile.lastHealthConcernDetail || '');
                              }}
                              className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                                formData.isSameConcern === true
                                  ? 'border-emerald-600 bg-white shadow-sm ring-1 ring-emerald-600'
                                  : 'border-emerald-200 bg-emerald-100/40 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.isSameConcern === true ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                                    {formData.isSameConcern === true && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </span>
                                  Same Recorded Concern
                                </span>
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                  {pricingConfig.followUpFee === 0 ? 'FREE' : `₹${pricingConfig.followUpFee}`}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-2 pl-6">
                                Follow-up window fee applies. Concern will be prefilled and locked.
                              </p>
                            </button>

                            {/* Different Concern */}
                            <button
                              type="button"
                              onClick={() => {
                                updateForm('isSameConcern', false);
                                updateForm('healthConcern', '');
                                updateForm('healthConcernOther', '');
                              }}
                              className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                                formData.isSameConcern === false
                                  ? 'border-teal-600 bg-white shadow-sm ring-1 ring-teal-600'
                                  : 'border-emerald-200 bg-emerald-100/40 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.isSameConcern === false ? 'border-teal-600 bg-teal-600' : 'border-slate-400'}`}>
                                    {formData.isSameConcern === false && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </span>
                                  New Case / Different Concern
                                </span>
                                <span className="text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded-full">
                                  ₹{pricingConfig.normalFee}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-2 pl-6">
                                Standard fee, booked on existing PID ({formData.pid || 'record'}).
                              </p>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* -------- CLINIC RECORDS INQUIRY -------- */}
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <label className="block text-sm font-semibold text-slate-800 mb-2">
                          Have you ever visited our clinic (offline) for the same presenting health concern?
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
                          <button 
                            type="button" onClick={() => updateForm('hasVisitedClinicForConcern', false)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${formData.hasVisitedClinicForConcern === false ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            No
                          </button>
                          <button 
                            type="button" onClick={() => updateForm('hasVisitedClinicForConcern', true)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${formData.hasVisitedClinicForConcern === true ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Yes
                          </button>
                        </div>

                        {formData.hasVisitedClinicForConcern === true && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
                              <strong>Why we ask:</strong> We maintain offline paper records arranged by your <em>locality/short address</em> and organized <em>date-wise</em> for the current month and <em>month-wise</em> for previous months. This helps the doctor retrieve your physical file before the consultation.
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Short Address in Clinic Records *</label>
                                <input 
                                  type="text" value={formData.shortAddress} onChange={e => updateForm('shortAddress', e.target.value)}
                                  placeholder="e.g. Near Hanuman Temple, Kothrud"
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">Colony name, area name, or locality given during offline visit.</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Approx. Last Visit Date/Month *</label>
                                <input 
                                  type="date" value={formData.lastVisitDate} onChange={e => updateForm('lastVisitDate', e.target.value)}
                                  max={format(new Date(), 'yyyy-MM-dd')}
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">Approximate date or first of the month if unsure of exact date.</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Next Step Button */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={onNextStep1} 
                    disabled={formData.phone.length < 10 || profilesLoading}
                    className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    Next Step <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 2: HEALTH & REPORTS */}
            {/* ------------------------------------------------------------- */}
            {step === 2 && (
              <motion.div 
                key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                className="p-6 sm:p-8"
              >
                <div className="mb-6 flex items-center gap-3">
                  <Stethoscope className="w-6 h-6 text-teal-600" />
                  <h2 className="text-xl font-bold text-slate-800">Health Concerns & Reports</h2>
                </div>

                {error && <div className="mb-6 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm">{error}</div>}

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">Primary Health Concern *</label>
                      {isFollowUp && selectedProfile?.lastHealthConcern && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3 text-emerald-700" /> Locked to Previous Concern
                        </span>
                      )}
                    </div>
                    <select 
                      value={formData.healthConcern || ''} 
                      onChange={e => updateForm('healthConcern', e.target.value)}
                      disabled={isFollowUp && Boolean(selectedProfile?.lastHealthConcern)}
                      className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        isFollowUp && Boolean(selectedProfile?.lastHealthConcern) ? 'opacity-85 bg-slate-100 cursor-not-allowed text-slate-800 font-semibold' : ''
                      }`}
                    >
                      <option value="">Select a concern...</option>
                      {HEALTH_CONCERNS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {(formData.healthConcern === 'Other' || (isFollowUp && selectedProfile?.lastHealthConcern === 'Other')) && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Describe Concern *</label>
                      <textarea 
                        value={formData.healthConcernOther} 
                        onChange={e => updateForm('healthConcernOther', e.target.value)}
                        disabled={isFollowUp && Boolean(selectedProfile?.lastHealthConcern)}
                        rows={3} 
                        className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                          isFollowUp && Boolean(selectedProfile?.lastHealthConcern) ? 'opacity-85 bg-slate-100 cursor-not-allowed text-slate-800' : ''
                        }`}
                        placeholder="Briefly describe your symptoms..."
                      />
                    </motion.div>
                  )}

                  {/* Reports Upload */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500" /> Upload Previous Reports
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Optional. PDF, JPG, PNG up to 20MB.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${formData.hasReports ? 'text-teal-600' : 'text-slate-500'}`}>{formData.hasReports ? 'Yes' : 'No'}</span>
                        <button 
                          type="button" onClick={() => updateForm('hasReports', !formData.hasReports)}
                          className={`w-12 h-6 rounded-full relative transition-colors ${formData.hasReports ? 'bg-teal-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${formData.hasReports ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    {formData.hasReports && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <div 
                          className="border-2 border-dashed border-teal-200 rounded-xl p-6 flex flex-col items-center justify-center bg-teal-50/30 hover:bg-teal-50/50 transition-colors cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-8 h-8 text-teal-400 mb-2" />
                          <p className="text-sm text-teal-800 font-medium">Click to browse files</p>
                          <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                        </div>
                        
                        {formData.reports.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {formData.reports.map((f, i) => (
                              <div key={i} className="flex items-center justify-between bg-white p-2 px-3 rounded-lg border border-slate-200 text-sm">
                                <span className="truncate max-w-[200px] sm:max-w-xs">{f.name}</span>
                                <button type="button" onClick={() => removeFile(i)} className="text-rose-500 hover:bg-rose-50 p-1 rounded-md">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Courier Option */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-500" /> Courier Medicines?
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Receive prescribed medicines at your doorstep.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${formData.needsCourier ? 'text-teal-600' : 'text-slate-500'}`}>{formData.needsCourier ? 'Yes' : 'No'}</span>
                        <button 
                          type="button" onClick={() => updateForm('needsCourier', !formData.needsCourier)}
                          className={`w-12 h-6 rounded-full relative transition-colors ${formData.needsCourier ? 'bg-teal-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${formData.needsCourier ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    {formData.needsCourier && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Complete Address *</label>
                          <textarea 
                            value={formData.courierAddress} onChange={e => updateForm('courierAddress', e.target.value)}
                            rows={3} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                            placeholder="House No, Street, Landmark, City, State"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pincode *</label>
                            <input 
                              type="text" maxLength={6} value={formData.courierPincode} onChange={e => updateForm('courierPincode', e.target.value.replace(/\D/g, ''))}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact No. *</label>
                            <input 
                              type="tel" maxLength={10} value={formData.courierPhone} onChange={e => updateForm('courierPhone', e.target.value.replace(/\D/g, ''))}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between">
                  <button onClick={prevStep} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all">
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>
                  <button onClick={onNextStep2} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all">
                    Next Step <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: PAYMENT */}
            {/* ------------------------------------------------------------- */}
            {step === 3 && (
              <motion.div 
                key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                className="p-6 sm:p-8"
              >
                <div className="mb-6 flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-teal-600" />
                  <h2 className="text-xl font-bold text-slate-800">Booking Summary & Payment</h2>
                </div>

                {error && <div className="mb-6 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm">{error}</div>}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                  <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">Patient Summary</h3>
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div><span className="text-slate-500 block mb-1">Name</span> <span className="font-medium text-slate-800">{formData.patientName}</span></div>
                    <div><span className="text-slate-500 block mb-1">Age / Gender</span> <span className="font-medium text-slate-800">{formData.age} yrs / {formData.gender}</span></div>
                    <div><span className="text-slate-500 block mb-1">Phone</span> <span className="font-medium text-slate-800">{formData.phone}</span></div>
                    <div><span className="text-slate-500 block mb-1">PID</span> <span className="font-medium text-slate-800">{formData.pid || 'Will be assigned'}</span></div>
                    <div className="col-span-2"><span className="text-slate-500 block mb-1">Health Concern</span> <span className="font-medium text-slate-800 truncate block">{formData.healthConcern === 'Other' ? formData.healthConcernOther : formData.healthConcern}</span></div>
                    {formData.needsCourier && (
                      <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-500 block mb-1">Courier Address</span>
                        <span className="font-medium text-slate-800">{formData.courierAddress}, {formData.courierPincode}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-teal-900">Consultation Fee</h3>
                    <p className="text-sm text-teal-700 mt-1">
                      {isFollowUp 
                        ? `Follow-up consultation within ${pricingConfig.followUpDays}-day window (Same Concern)` 
                        : (formData.isSameConcern === false
                            ? `Standard consultation (New case - Linked to PID ${formData.pid || 'record'})`
                            : 'Standard online video consultation')}
                    </p>
                  </div>
                  <div className="text-right">
                    {isFree ? (
                      <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold text-xl inline-flex items-center gap-1">
                        FREE
                      </div>
                    ) : (
                      <div className="font-bold text-3xl text-teal-900 flex items-center">
                        <IndianRupee className="w-6 h-6" /> {effectiveFee}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between">
                  <button onClick={prevStep} disabled={loading} className="order-2 sm:order-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50">
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>
                  <button onClick={handlePayment} disabled={loading} className="order-1 sm:order-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl flex justify-center items-center gap-2 transition-all shadow-md disabled:opacity-50">
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : isFree ? 'Continue to Slots' : `Pay ₹${effectiveFee} & Continue`}
                    {!loading && <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 4: SLOTS */}
            {/* ------------------------------------------------------------- */}
            {step === 4 && (
              <motion.div 
                key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                className="p-6 sm:p-8"
              >
                <div className="mb-6 flex items-center gap-3">
                  <CalendarDays className="w-6 h-6 text-teal-600" />
                  <h2 className="text-xl font-bold text-slate-800">Choose Date & Time</h2>
                </div>

                {error && <div className="mb-6 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm">{error}</div>}

                {/* Date Selection Horizontal Scroll */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Select Date</label>
                  <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x">
                    {dateOptions.map((opt, i) => {
                      const isSelected = formData.appointmentDate === opt.dateStr;
                      return (
                        <button
                          key={i}
                          disabled={opt.isClosed}
                          onClick={() => updateForm('appointmentDate', opt.dateStr)}
                          className={`flex-shrink-0 snap-center flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${
                            opt.isClosed 
                              ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' 
                              : isSelected 
                                ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-105' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50'
                          }`}
                        >
                          <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-teal-100' : ''}`}>{opt.dayName}</span>
                          <span className="text-lg font-bold">{opt.dayNum}</span>
                        </button>
                      );
                    })}
                  </div>
                  {formData.appointmentDate && (
                    <p className="text-sm text-slate-500 mt-2">
                      Selected: <span className="font-semibold text-slate-800">{format(parseISO(formData.appointmentDate), 'EEEE, MMMM d, yyyy')}</span>
                    </p>
                  )}
                </div>

                {/* Time Slots */}
                {formData.appointmentDate ? (
                  <div className="space-y-6 min-h-[200px]">
                    {loading ? (
                      <div className="flex justify-center items-center h-32">
                        <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Morning */}
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-2">
                            <Clock className="w-4 h-4 text-amber-500" /> Morning (11 AM - 2 PM)
                          </h4>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {availableSlots.morning.map((time, i) => (
                              <button
                                key={`m-${i}`}
                                onClick={() => updateForm('appointmentTime', time)}
                                className={`py-2 px-1 text-sm font-medium rounded-xl border transition-all ${
                                  formData.appointmentTime === time
                                    ? 'bg-teal-50 border-teal-500 text-teal-700 ring-1 ring-teal-500 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                                }`}
                              >
                                {formatTimeSlotSafe(time)}
                              </button>
                            ))}
                            {availableSlots.morning.length === 0 && <span className="text-sm text-slate-400 italic col-span-full">No morning slots available</span>}
                          </div>
                        </div>

                        {/* Evening */}
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-2">
                            <Clock className="w-4 h-4 text-indigo-500" /> Evening (5:30 PM - 8 PM)
                          </h4>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {availableSlots.evening.map((time, i) => (
                              <button
                                key={`e-${i}`}
                                onClick={() => updateForm('appointmentTime', time)}
                                className={`py-2 px-1 text-sm font-medium rounded-xl border transition-all ${
                                  formData.appointmentTime === time
                                    ? 'bg-teal-50 border-teal-500 text-teal-700 ring-1 ring-teal-500 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                                }`}
                              >
                                {formatTimeSlotSafe(time)}
                              </button>
                            ))}
                            {availableSlots.evening.length === 0 && <span className="text-sm text-slate-400 italic col-span-full">No evening slots available</span>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>Please select a date to view available time slots.</p>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between">
                  <button onClick={prevStep} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all">
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>
                  <button 
                    onClick={handleBookSlot} 
                    disabled={!formData.appointmentDate || !formData.appointmentTime || loading}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 5: SUCCESS */}
            {/* ------------------------------------------------------------- */}
            {step === 5 && confirmationData && (
              <motion.div 
                key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="p-8 sm:p-12 text-center"
              >
                <motion.div 
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                  className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </motion.div>
                
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Appointment Confirmed!</h2>
                <p className="text-slate-500 mb-8">A confirmation email has been sent to your email address.</p>
                
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-sm mx-auto text-left mb-8">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4 pb-4 border-b border-slate-200">
                    <div><span className="text-slate-500 block text-xs">Date</span> <strong className="text-slate-800">{format(parseISO(confirmationData.date), 'MMM d, yyyy')}</strong></div>
                    <div><span className="text-slate-500 block text-xs">Time</span> <strong className="text-slate-800">{confirmationData.time}</strong></div>
                    <div><span className="text-slate-500 block text-xs">Apt ID</span> <strong className="text-slate-800 font-mono">{confirmationData.appointmentId}</strong></div>
                    <div><span className="text-slate-500 block text-xs">Patient Name</span> <strong className="text-slate-800">{formData.patientName}</strong></div>
                  </div>
                  
                  <div className="bg-teal-50 rounded-xl p-4 flex items-center gap-3">
                    <Video className="w-6 h-6 text-teal-600 shrink-0" />
                    <div>
                      <span className="text-xs text-teal-800 font-semibold block mb-0.5">Google Meet Link</span>
                      <a href={confirmationData.meetLink} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:underline break-all">
                        {confirmationData.meetLink}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href={confirmationData.meetLink} target="_blank" rel="noopener noreferrer"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Video className="w-5 h-5" /> Join Meeting
                  </a>
                  <button 
                    onClick={generateICS}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Download className="w-5 h-5" /> Save to Calendar
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <FileText className="w-5 h-5" /> Download Receipt
                  </button>
                </div>
                
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-8 text-sm font-semibold text-teal-600 hover:underline"
                >
                  Book Another Appointment
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
