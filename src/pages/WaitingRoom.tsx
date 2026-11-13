import React, { useEffect, useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Activity, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WaitingRoom() {
  const { state, fetchState } = useClinic();
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lastCalled, setLastCalled] = useState<string | null>(null);

  const currentPatient = state.patients.find(p => p.id === state.currentPatientId);
  
  // All waiting patients & accurate count
  const allWaitingPatients = state.patients.filter(p => p.status === 'Waiting');
  const totalWaiting = allWaitingPatients.length;
  const displayedPatients = allWaitingPatients.slice(0, 5); // Display top 5 on screen
  const remainingCount = Math.max(0, totalWaiting - displayedPatients.length);
  const remainingPatients = allWaitingPatients.slice(5);

  // 1. Lock document and body scrolling so TV web browsers NEVER show scrollbars or scroll
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

  // 2. Fetch initial state on mount and sync on wake/focus.
  // Real-time queue updates are driven event-by-event via SSE (Zero polling loops)
  useEffect(() => {
    fetchState();

    const onWake = () => {
      if (document.visibilityState === 'visible') {
        fetchState();
      }
    };

    window.addEventListener('focus', fetchState);
    document.addEventListener('visibilitychange', onWake);

    return () => {
      window.removeEventListener('focus', fetchState);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [fetchState]);

  // 3. Audio chime notification when a new token is called
  useEffect(() => {
    if (currentPatient && currentPatient.id !== lastCalled) {
      setLastCalled(currentPatient.id);
      if (audioEnabled) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
          }
        } catch (e) {
          console.error("Audio playback failed", e);
        }
      }
    }
  }, [currentPatient, lastCalled, audioEnabled]);

  return (
    <div className="fixed inset-0 h-screen w-screen max-w-full max-h-full overflow-hidden bg-slate-900 text-white flex flex-col font-sans select-none box-border">
      
      {/* Header */}
      <header className="shrink-0 h-16 md:h-20 px-6 md:px-8 flex justify-between items-center bg-slate-800 border-b border-slate-700 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Activity className="w-8 h-8 md:w-9 md:h-9 text-teal-400 shrink-0" />
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight truncate">
            {state.settings?.clinicName || 'Krishna Homoeopathic Clinic'}
          </h1>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Live pulse indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300 tracking-wider">LIVE</span>
          </div>

          {/* Audio toggle button */}
          <button 
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2.5 md:p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 focus:outline-none"
            title={audioEnabled ? "Mute Chime" : "Enable Chime"}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5 md:w-6 md:h-6" /> : <VolumeX className="w-5 h-5 md:w-6 md:h-6" />}
          </button>
        </div>
      </header>

      {/* Main Content: Guaranteed 2-Column Side-by-Side TV Layout (Zero Scrolling, Zero Overlap) */}
      <main className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-6 py-4 md:px-8 md:py-6 grid grid-cols-2 gap-8 md:gap-12 items-stretch overflow-hidden">
        
        {/* Left Column: Now Serving */}
        <div className="flex flex-col h-full min-h-0 justify-start items-center">
          {/* Section Heading */}
          <div className="shrink-0 w-full flex items-center justify-center pb-3 mb-3 border-b border-slate-700/60">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-400 uppercase tracking-widest text-center">
              Now Serving
            </h2>
          </div>

          {/* Card Container (strictly isolated to prevent overlap) */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2">
            {currentPatient ? (
              <div 
                key={currentPatient.id}
                className="w-full max-w-md bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(20,184,166,0.35)] border-4 border-teal-400 text-center relative overflow-hidden flex flex-col items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                <div className="relative z-10 w-full flex flex-col items-center">
                  <p className="text-teal-50 text-lg md:text-xl font-medium mb-1">
                    Token Number
                  </p>
                  <p className="text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight my-2 drop-shadow-md leading-none">
                    {currentPatient.token}
                  </p>
                  <div className="inline-block bg-teal-950/40 backdrop-blur-sm px-6 py-2 rounded-full border border-teal-300/40 my-2 max-w-full">
                    <p className="text-lg md:text-xl font-bold text-teal-50 truncate">
                      {state.settings?.doctorName || 'Dr.Sunil Kumar (B.H.M.S)'}
                    </p>
                  </div>
                  <div className="mt-2 text-teal-100 font-bold text-base md:text-lg uppercase tracking-wider">
                    {currentPatient.visitType}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center mb-4 text-slate-500">
                  <Activity className="w-8 h-8 animate-pulse text-teal-400/70" />
                </div>
                <p className="text-3xl md:text-4xl font-light text-slate-500 tracking-wide">
                  Please wait to be called
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Next in Line */}
        <div className="flex flex-col h-full min-h-0 justify-between">
          {/* Section Heading with accurate Total Count */}
          <div className="shrink-0 flex items-center justify-between pb-3 mb-2 border-b border-slate-700">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-400 uppercase tracking-widest">
              Next in Line
            </h2>
            {totalWaiting > 0 && (
              <span className="text-xs md:text-sm font-semibold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-teal-300">
                {totalWaiting} Waiting
              </span>
            )}
          </div>

          {/* Queue List (Displays Top 5 Cards) */}
          <div className="flex-1 min-h-0 flex flex-col justify-start gap-2 overflow-hidden">
            {displayedPatients.length > 0 ? (
              displayedPatients.map((patient, index) => {
                const isEmergency = patient.priority === 'Emergency';
                const isSenior = patient.priority === 'Senior Citizen';
                const hasPriority = isEmergency || isSenior;

                return (
                  <div
                    key={patient.id}
                    className={cn(
                      "flex-1 min-h-0 max-h-[90px] flex items-center justify-between px-5 py-2 rounded-2xl border transition-colors box-border",
                      index === 0
                        ? "bg-slate-800 border-teal-500/70 shadow-lg ring-1 ring-teal-500/30"
                        : "bg-slate-800/60 border-slate-700/80"
                    )}
                  >
                    {/* Left: Token and metadata */}
                    <div className="flex flex-col justify-center min-w-0 pr-3">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "font-black tracking-tight leading-none",
                          index === 0 ? "text-3xl md:text-4xl text-white" : "text-2xl md:text-3xl text-slate-200"
                        )}>
                          {patient.token}
                        </span>

                        {hasPriority && (
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0",
                            isEmergency
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          )}>
                            {patient.priority}
                          </span>
                        )}
                      </div>

                      <div className={cn(
                        "mt-1 uppercase tracking-wider font-semibold text-xs truncate",
                        index === 0 ? "text-teal-300" : "text-slate-400"
                      )}>
                        {patient.visitType}
                      </div>
                    </div>

                    {/* Right: Get Ready tag or Queue Number */}
                    {index === 0 ? (
                      <div className="text-teal-300 font-bold text-xs md:text-sm uppercase tracking-wider animate-pulse shrink-0 px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-400/40">
                        Get Ready
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider shrink-0">
                        #{index + 1}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-800/30 rounded-2xl border border-slate-700/40 text-center">
                <p className="text-slate-500 text-xl italic">
                  No patients waiting
                </p>
                <p className="text-slate-600 text-sm mt-1">
                  New check-ins will appear here automatically
                </p>
              </div>
            )}
          </div>

          {/* Bottom Banner: Shows remaining patients beyond top 5 */}
          {remainingCount > 0 && (
            <div className="shrink-0 mt-2 px-4 py-2 rounded-xl bg-slate-800/95 border border-teal-500/30 flex items-center justify-between text-xs md:text-sm shadow-md">
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <span className="font-bold text-teal-400 shrink-0">
                  +{remainingCount} more:
                </span>
                <span className="text-slate-300 font-mono tracking-wider truncate">
                  {remainingPatients.map(p => p.token).join(', ')}
                </span>
              </div>
              <span className="text-slate-400 font-medium text-xs shrink-0 ml-3">
                Total: <strong className="text-white">{totalWaiting}</strong>
              </span>
            </div>
          )}
        </div>

      </main>
      
      {/* Footer Ticker */}
      <footer className="shrink-0 h-10 md:h-12 bg-teal-900 border-t border-teal-800 flex items-center overflow-hidden">
        <div className="whitespace-nowrap flex animate-marquee gap-8 items-center text-teal-200 font-medium text-sm md:text-base">
          {totalWaiting > 0 && (
            <span className="text-white font-bold bg-teal-800/80 px-3 py-0.5 rounded-full border border-teal-600">
              • Total Patients Waiting: {totalWaiting}
            </span>
          )}
          {remainingCount > 0 && (
            <span className="text-amber-300 font-semibold">
              • Next tokens in queue: {remainingPatients.map(p => p.token).join(', ')}
            </span>
          )}
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
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </div>
  );
}
