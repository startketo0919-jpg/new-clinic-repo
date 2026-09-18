const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

const toggles = `

              <div className="mt-8 border-t border-slate-200 pt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Email Automation Rules</h3>
                <p className="text-sm text-slate-500 mb-6">Choose which events trigger an automated email to patients.</p>

                <div className="flex flex-col gap-4 max-w-xl">
                  {[
                    { key: 'emailAutoCheckIn', label: 'Check-in Successful', desc: 'Send token and check-in confirmation.' },
                    { key: 'emailAutoNextInQueue', label: 'Next in Queue', desc: 'Alert patient when they are next.' },
                    { key: 'emailAutoApptConfirmed', label: 'Appointment Confirmed', desc: 'Send confirmation when appointment is scheduled.' },
                    { key: 'emailAutoFollowUp', label: 'Follow-up Scheduled', desc: 'Notify patient of future follow-up dates.' },
                    { key: 'emailAutoNewPid', label: 'New Patient Registration', desc: 'Send welcome email with new PID details.' },
                  ].map(rule => (
                    <label key={rule.key} className="flex items-start gap-3 cursor-pointer">
                      <div className="relative flex items-center pt-1">
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                          checked={(state.settings as any)[rule.key] ?? true}
                          onChange={(e) => updateSettings({ [rule.key]: e.target.checked })}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{rule.label}</div>
                        <div className="text-sm text-slate-500">{rule.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
`;

code = code.replace(
  /placeholder="Enter SMTP password"\n\s*\/>\n\s*<\/div>\n\s*<\/div>/,
  `placeholder="Enter SMTP password"\n                      />\n                    </div>\n                  </div>\n${toggles}`
);

fs.writeFileSync('src/pages/SettingsPage.tsx', code);
