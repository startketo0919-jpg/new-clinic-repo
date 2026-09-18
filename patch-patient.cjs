const fs = require('fs');
let code = fs.readFileSync('src/pages/PatientTracker.tsx', 'utf8');

code = code.replace(
  "const [duplicatePrompt, setDuplicatePrompt] = useState<null | {",
  "const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);\n  const [duplicatePrompt, setDuplicatePrompt] = useState<null | {"
);

const oldCancelButton = `
                        <button 
                          onClick={() => {
                            if(window.confirm('Are you sure you want to cancel this appointment?')) {
                              cancelAppointment(app.id);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
`;

const newCancelButton = `
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
`;

// regex matching variations
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*if\(window\.confirm\('Are you sure you want to cancel this appointment\?'\)\) \{\s*cancelAppointment\(app\.id\);\s*\}\s*\}\}\s+className="px-3 py-1\.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold rounded-lg transition-colors"\s*>\s*Cancel\s*<\/button>/,
  newCancelButton
);

fs.writeFileSync('src/pages/PatientTracker.tsx', code);
