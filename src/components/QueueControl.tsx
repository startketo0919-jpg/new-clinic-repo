import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { Play, Check, X, BellRing, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getLocalTodayString, isSameDayLocal } from '../lib/dateUtils';

export default function QueueControl() {
  const { state, updatePatientStatus } = useClinic();

  const currentPatient = state.patients.find(p => p.id === state.currentPatientId);
  const todayStr = getLocalTodayString();
  const nextPatient = state.patients.find(p => p.status === 'Waiting' && isSameDayLocal(p.checkInTime, todayStr)); // Simple picking of the first waiting


  const handleCallNext = () => {
    if (nextPatient) {
      updatePatientStatus(nextPatient.id, 'In Room');
      // In a real app with a backend, this might emit a socket event to the TV
      // For now, it just updates state.
    }
  };

  const handleComplete = () => {
    if (currentPatient) {
      updatePatientStatus(currentPatient.id, 'Completed');
    }
  };

  const handleSkip = () => {
    if (currentPatient) {
      updatePatientStatus(currentPatient.id, 'Skipped');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
      
      {/* Current Patient Display */}
      <div className="flex-1 w-full border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Play className="w-4 h-4 text-teal-500" />
          Currently In Room
        </h3>
        
        {currentPatient ? (
          <div className="flex items-center gap-4">
            <div className="bg-teal-50 text-teal-700 w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl border border-teal-100">
              {currentPatient.token.split('-')[1]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{currentPatient.fullName}</h2>
              <div className="flex items-center gap-2 text-sm mt-1">
                <span className="text-slate-500">{currentPatient.age}y • {currentPatient.gender}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-slate-500">{currentPatient.visitType}</span>
                {currentPatient.priority !== 'Normal' && (
                  <>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className={cn("font-medium", currentPatient.priority === 'Emergency' ? 'text-rose-600' : 'text-amber-600')}>
                      {currentPatient.priority}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-slate-400">
            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-100">
              --
            </div>
            <span className="text-lg">No patient in room</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-1 w-full flex flex-col gap-4 pl-0 md:pl-2">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Queue Actions
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleCallNext}
            disabled={!!currentPatient || !nextPatient}
            className="col-span-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <BellRing className="w-5 h-5" />
            Call Next: {nextPatient ? nextPatient.token : '--'}
          </button>
          <button 
            onClick={handleComplete}
            disabled={!currentPatient}
            className="bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-200 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Complete
          </button>
          <button 
            onClick={handleSkip}
            disabled={!currentPatient}
            className="bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            No-Show
          </button>
        </div>
      </div>

    </div>
  );
}

