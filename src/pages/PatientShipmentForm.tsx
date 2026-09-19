import React, { useState, useEffect } from 'react';
import { Package, Send, CheckCircle2, ShieldCheck, Phone, Mail, MapPin, Building, AlertCircle, Sparkles } from 'lucide-react';

export default function PatientShipmentForm() {
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');

  // Anti-spam security fields
  const [botTrap, setBotTrap] = useState('');
  const [formLoadTime, setFormLoadTime] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  useEffect(() => {
    setFormLoadTime(Date.now());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client validation
    if (!patientName.trim()) {
      setErrorMsg("Please enter Patient Name.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const validPhone = cleanPhone.length === 10 ? cleanPhone : (cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone);
    if (!/^[6-9]\d{9}$/.test(validPhone)) {
      setErrorMsg("Please enter a valid 10-digit Indian Mobile Number.");
      return;
    }

    if (!address.trim() || address.trim().length < 8) {
      setErrorMsg("Please enter a complete delivery address (House/Flat No, Landmark, Area, City, State).");
      return;
    }

    const cleanPincode = pincode.replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit PIN code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/shipments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientName.trim(),
          phone: validPhone,
          email: email.trim() || undefined,
          address: address.trim(),
          pincode: cleanPincode,
          notes: notes.trim() || undefined,
          botField: botTrap,
          formLoadTime,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit form. Please try again.");
      }

      setSubmittedData({
        id: data.id,
        patientName: patientName.trim(),
        phone: validPhone,
        address: address.trim(),
        pincode: cleanPincode,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPatientName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setPincode('');
    setNotes('');
    setBotTrap('');
    setFormLoadTime(Date.now());
    setSubmittedData(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 py-10 px-4 sm:px-6 flex flex-col justify-center items-center font-sans">
      
      {/* Clinic Header Brand */}
      <div className="w-full max-w-xl text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-3 shadow-lg backdrop-blur-md">
          <Package className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Krishna Homoeopathic Clinic</h1>
        <p className="text-teal-400 font-medium text-sm mt-1">Medicine Courier Shipment Form</p>
      </div>

      <div className="w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8">
        
        {submittedData ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Details Received!</h2>
            <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto">
              Thank you, <span className="font-semibold text-slate-800">{submittedData.patientName}</span>. Your medicine courier delivery details have been recorded by the clinic.
            </p>

            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs sm:text-sm text-slate-700 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Receiver Phone:</span>
                <span className="font-semibold text-slate-900">+91 {submittedData.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Delivery Pincode:</span>
                <span className="font-semibold text-slate-900">{submittedData.pincode}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 block mb-1">Address:</span>
                <p className="font-medium text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">{submittedData.address}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Our clinic dispatch team will process your shipment shortly.</span>
            </div>

            <button
              onClick={handleReset}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors shadow-md"
            >
              Submit Another Response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <p className="text-xs text-slate-500 mb-4">
                Please provide your complete shipping address and contact number so our dispensary can safely courier your medicines.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Anti-spam honeypot hidden field */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <input
                type="text"
                name="website"
                value={botTrap}
                onChange={(e) => setBotTrap(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Patient Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Patient Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-sm outline-none transition-all"
                />
              </div>
            </div>

            {/* Phone & Email Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Receiver's Mobile <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-medium text-slate-500">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-sm outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email ID <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Complete Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Complete Delivery Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="House / Flat No, Building Name, Street / Road, Landmark, Area, City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-sm outline-none transition-all resize-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Include nearby landmark for faster courier delivery.
              </span>
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Delivery Postal PIN Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="6-digit Pincode (e.g. 208001)"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-sm outline-none transition-all font-mono tracking-wider"
              />
            </div>

            {/* Additional Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Doctor / Medicine Remarks <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Sunil Kumar prescription / 1 month dosage"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-sm outline-none transition-all"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-teal-700/30 hover:shadow-teal-700/50 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Details...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Courier Address</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Protected submission for Krishna Homoeopathic Clinic</span>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
