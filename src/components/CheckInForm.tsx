import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Priority, VisitType } from '../types';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function CheckInForm() {
  const { state, addPatient } = useClinic();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [visitType, setVisitType] = useState<VisitType>('Follow-up');
  
  const [success, setSuccess] = useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState<null | any[]>(null);

  const executeCheckIn = (explicitClinicId?: string) => {
    addPatient({
      email,
      fullName,
      phone,
      age: parseInt(age, 10),
      gender,
      priority,
      visitType,
      shiftPreference: 'Morning'
    }, explicitClinicId);
    
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    
    // Reset
    setFullName('');
    setPhone('');
    setAge('');
    setGender('Male');
    setPriority('Normal');
    setVisitType('Follow-up');
    setDuplicatePrompt(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return;
    
    const matchingRecords = state.patientRegistry.filter(r => r.phone === phone);
    
    if (matchingRecords.length > 0) {
      const exactMatch = matchingRecords.find(r => r.fullName.toLowerCase() === fullName.toLowerCase());
      if (exactMatch) {
         executeCheckIn(exactMatch.clinicId);
         return;
      }
      setDuplicatePrompt(matchingRecords);
      return;
    }
    
    executeCheckIn();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-teal-400" />
          Patient Check-In
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        {success && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4" />
            Patient successfully added to queue.
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input 
            type="text" 
            required 
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            placeholder="e.g. John Doe"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              placeholder="email@example.com"
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
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              placeholder="10 digits"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
            <input 
              type="number" 
              required 
              min="1"
              max="120"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              placeholder="Age"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select 
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Visit Type</label>
            <select 
              value={visitType}
              onChange={e => setVisitType(e.target.value as VisitType)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            >
              <option value="New">New</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Report Review">Report Review</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
          <div className="grid grid-cols-3 gap-2">
            {(['Normal', 'Senior Citizen', 'Emergency'] as Priority[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                  priority === p 
                    ? p === 'Emergency' ? 'bg-rose-50 border-rose-500 text-rose-700' :
                      p === 'Senior Citizen' ? 'bg-amber-50 border-amber-500 text-amber-700' :
                      'bg-teal-50 border-teal-500 text-teal-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <button 
          type="submit"
          className="mt-2 w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add to Queue
        </button>
      </form>
      
      {duplicatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-lg">Existing Phone Number</h3>
            </div>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              We found existing patients registered with this phone number. Are you one of these patients, or are you creating a new profile?
            </p>
            
            <div className="flex flex-col gap-3 mb-6 max-h-60 overflow-y-auto">
              {duplicatePrompt.map((match: any) => (
                <button
                  key={match.clinicId}
                  onClick={() => executeCheckIn(match.clinicId)}
                  className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors text-left"
                >
                  <span className="font-bold text-slate-800">{match.fullName}</span>
                  <span className="text-xs text-slate-500 mt-1">ID: {match.clinicId} • {match.age} yrs • {match.gender}</span>
                </button>
              ))}
            </div>
            
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => executeCheckIn()}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create New Profile
              </button>
              <button
                onClick={() => setDuplicatePrompt(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
