const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

const todayStrCode = `  const todayStr = new Date().toISOString().split('T')[0];
  const pendingToday = patientAppointments.find(a => a.date === todayStr);`;

code = code.replace(/const patientAppointments = state\.appointments\.filter[^\n]*;/g, `const patientAppointments = state.appointments.filter(a => a.clinicId === trackedClinicId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());\n${todayStrCode}`);

code = code.replace(/<p className="font-medium text-slate-700">No Active Visit Today<\/p>/, `{pendingToday ? (
                    <p className="font-medium text-slate-700">Pending Approval for Today</p>
                  ) : (
                    <p className="font-medium text-slate-700">No Active Visit Today</p>
                  )}`);

code = code.replace(/<p className="text-sm mt-1 mb-4">If you are at the clinic, please check in at reception or via self check-in\.<\/p>/, `{pendingToday ? (
                    <p className="text-sm mt-1 mb-4">Your self check-in is pending approval from the reception. You will be assigned a token shortly.</p>
                  ) : (
                    <p className="text-sm mt-1 mb-4">If you are at the clinic, please check in at reception or via self check-in.</p>
                  )}`);

code = code.replace(/<button[\s\S]*?Check In Now\n\s*<\/button>/, `{!pendingToday && (
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
                  )}`);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
