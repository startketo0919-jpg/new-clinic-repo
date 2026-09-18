import React, { useEffect, useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Activity, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function WaitingRoom() {
  const { state } = useClinic();
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lastCalled, setLastCalled] = useState<string | null>(null);

  const currentPatient = state.patients.find(p => p.id === state.currentPatientId);
  const waitingPatients = state.patients.filter(p => p.status === 'Waiting').slice(0, 5); // Show next 5

  useEffect(() => {
    if (currentPatient && currentPatient.id !== lastCalled) {
      setLastCalled(currentPatient.id);
      if (audioEnabled) {
        // Simple chime mock
        try {
          const ctx = new window.AudioContext();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // Drop to A4
          
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
          console.error("Audio playback failed", e);
        }
      }
    }
  }, [currentPatient, lastCalled, audioEnabled]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <Activity className="w-10 h-10 text-teal-400" />
          <h1 className="text-3xl font-bold tracking-tight">Krishna Homoeopathic Clinic</h1>
        </div>
        <button 
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
        >
          {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 p-8 gap-12 items-center max-w-[1600px] w-full mx-auto">
        
        {/* Now Serving */}
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-3xl font-semibold text-slate-400 uppercase tracking-widest mb-8">Now Serving</h2>
          <AnimatePresence mode="popLayout">
            {currentPatient ? (
              <motion.div 
                key={currentPatient.id}
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -50 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                className="bg-teal-500 rounded-[3rem] p-16 shadow-[0_0_100px_rgba(20,184,166,0.3)] border-4 border-teal-400 text-center w-full max-w-lg relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <div className="relative z-10">
                  <p className="text-teal-50 text-2xl font-medium mb-4">Token Number</p>
                  <p className="text-8xl font-black text-white tracking-tighter mb-6 drop-shadow-lg">
                    {currentPatient.token}
                  </p>
                  <div className="inline-block bg-teal-900/50 backdrop-blur-md px-8 py-3 rounded-full border border-teal-400/50">
                    <p className="text-2xl font-bold text-teal-50">Dr.Sunil Kumar (B.H.M.S)</p>
                  </div>
                  <div className="mt-4 text-teal-100 font-semibold text-xl uppercase tracking-wider">
                    {currentPatient.visitType}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-16"
              >
                <p className="text-6xl font-light text-slate-600">Please wait to be called</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Next in Line */}
        <div className="flex flex-col h-full justify-center">
          <h2 className="text-3xl font-semibold text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-700 pb-4">
            Next in Line
          </h2>
          <div className="flex flex-col gap-6">
            <AnimatePresence>
              {waitingPatients.length > 0 ? (
                waitingPatients.map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    layout
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    className={cn(
                      "flex items-center justify-between p-6 rounded-3xl border",
                      index === 0 ? "bg-slate-800 border-slate-600 transform scale-105 shadow-xl" : "bg-slate-800/50 border-slate-700"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "font-black tracking-tighter",
                          index === 0 ? "text-6xl text-white" : "text-4xl text-slate-400"
                        )}>
                          {patient.token}
                        </div>
                        {patient.priority !== 'Normal' && (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider",
                            patient.priority === 'Emergency' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          )}>
                            {patient.priority}
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        "mt-1 uppercase tracking-widest font-semibold",
                        index === 0 ? "text-slate-300 text-lg" : "text-slate-500 text-sm"
                      )}>
                        {patient.visitType}
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="text-teal-400 font-medium text-lg uppercase tracking-wider animate-pulse">
                        Get Ready
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="text-slate-500 text-2xl italic p-8 bg-slate-800/30 rounded-3xl border border-slate-700/50 text-center">
                  No patients waiting
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>
      
      {/* Footer Ticker */}
      <footer className="bg-teal-900 border-t border-teal-800 py-3 overflow-hidden">
        <div className="whitespace-nowrap flex animate-marquee gap-8 items-center text-teal-200 font-medium text-lg">
          <span>• Welcome to the Clinic</span>
          <span>• Clinic Timings: Morning : 9:30am to 2:00pm, Evening : 5:00pm to 8:00pm (Wednesday Close)</span>
          <span>• Please keep your phone on silent</span>
          <span>• Have your previous reports ready</span>
        </div>
      </footer>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
