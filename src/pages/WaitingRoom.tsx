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

  // Lock body/html scroll so TV browsers never scroll or display scrollbars
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

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
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full overflow-hidden bg-slate-900 text-white flex flex-col font-sans select-none">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 flex justify-between items-center bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <Activity className="w-9 h-9 text-teal-400 shrink-0" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Krishna Homoeopathic Clinic</h1>
        </div>
        <button 
          type="button"
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 shrink-0"
        >
          {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>
      </header>

      {/* Main: ALWAYS 2 columns side-by-side on TV, exactly like Laptop */}
      <main className="flex-1 min-h-0 grid grid-cols-2 p-6 md:p-8 gap-8 md:gap-12 items-center max-w-[1600px] w-full mx-auto overflow-hidden">
        
        {/* Now Serving */}
        <div className="flex flex-col items-center justify-center h-full min-h-0">
          <h2 className="shrink-0 text-2xl md:text-3xl font-semibold text-slate-400 uppercase tracking-widest mb-6 md:mb-8">
            Now Serving
          </h2>
          <div className="flex-1 min-h-0 flex items-center justify-center w-full">
            <AnimatePresence mode="popLayout">
              {currentPatient ? (
                <motion.div 
                  key={currentPatient.id}
                  initial={{ opacity: 0, scale: 0.8, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.1, y: -50 }}
                  transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                  className="bg-teal-500 rounded-3xl md:rounded-[3rem] p-6 md:p-10 lg:p-12 shadow-[0_0_100px_rgba(20,184,166,0.3)] border-4 border-teal-400 text-center w-full max-w-md lg:max-w-lg relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                  <div className="relative z-10">
                    <p className="text-teal-50 text-xl md:text-2xl font-medium mb-2 md:mb-4">Token Number</p>
                    <p className="text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-4 md:mb-6 drop-shadow-lg leading-none">
                      {currentPatient.token}
                    </p>
                    <div className="inline-block bg-teal-900/50 backdrop-blur-md px-6 py-2 md:px-8 md:py-3 rounded-full border border-teal-400/50">
                      <p className="text-lg md:text-2xl font-bold text-teal-50">Dr.Sunil Kumar (B.H.M.S)</p>
                    </div>
                    <div className="mt-3 md:mt-4 text-teal-100 font-semibold text-base md:text-xl uppercase tracking-wider">
                      {currentPatient.visitType}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-8 md:p-12"
                >
                  <p className="text-4xl md:text-5xl lg:text-6xl font-light text-slate-600">Please wait to be called</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Next in Line */}
        <div className="flex flex-col h-full min-h-0 justify-center">
          <h2 className="shrink-0 text-2xl md:text-3xl font-semibold text-slate-400 uppercase tracking-widest mb-4 md:mb-6 border-b border-slate-700 pb-3 md:pb-4">
            Next in Line
          </h2>
          <div className="flex-1 min-h-0 flex flex-col justify-center gap-3 md:gap-4 overflow-hidden">
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
                      "flex-1 min-h-0 max-h-[100px] flex items-center justify-between px-6 py-3 rounded-2xl md:rounded-3xl border transition-all",
                      index === 0 ? "bg-slate-800 border-slate-600 shadow-xl" : "bg-slate-800/50 border-slate-700"
                    )}
                  >
                    <div className="flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className={cn(
                          "font-black tracking-tighter leading-none",
                          index === 0 ? "text-4xl md:text-5xl lg:text-6xl text-white" : "text-3xl md:text-4xl text-slate-400"
                        )}>
                          {patient.token}
                        </div>
                        {patient.priority !== 'Normal' && (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider shrink-0",
                            patient.priority === 'Emergency' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          )}>
                            {patient.priority}
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        "mt-1 uppercase tracking-widest font-semibold truncate",
                        index === 0 ? "text-slate-300 text-sm md:text-base lg:text-lg" : "text-slate-500 text-xs md:text-sm"
                      )}>
                        {patient.visitType}
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="text-teal-400 font-medium text-sm md:text-lg uppercase tracking-wider animate-pulse shrink-0 ml-4">
                        Get Ready
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="text-slate-500 text-xl md:text-2xl italic p-6 md:p-8 bg-slate-800/30 rounded-3xl border border-slate-700/50 text-center">
                  No patients waiting
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>
      
      {/* Footer Ticker */}
      <footer className="shrink-0 bg-teal-900 border-t border-teal-800 py-3 overflow-hidden">
        <div className="whitespace-nowrap flex animate-marquee gap-8 items-center text-teal-200 font-medium text-base md:text-lg">
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
