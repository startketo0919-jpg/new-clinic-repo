const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const togglesUI = `
                  <div className="flex items-center justify-between mt-4">
                    <label className="text-sm text-slate-600">Auto-send Registration (Same Day)</label>
                    <input type="checkbox" checked={waAutoRegisterSameDay} onChange={e => setWaAutoRegisterSameDay(e.target.checked)} className="w-4 h-4 accent-teal-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-600">Auto-send Registration (Future)</label>
                    <input type="checkbox" checked={waAutoRegisterFuture} onChange={e => setWaAutoRegisterFuture(e.target.checked)} className="w-4 h-4 accent-teal-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-600">Auto-send Next in Queue</label>
                    <input type="checkbox" checked={waAutoQueueAlert} onChange={e => setWaAutoQueueAlert(e.target.checked)} className="w-4 h-4 accent-teal-600" />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm text-slate-600">Auto-send Follow-up Reminder</label>
                    <input type="checkbox" checked={waAutoFollowUp} onChange={e => setWaAutoFollowUp(e.target.checked)} className="w-4 h-4 accent-teal-600" />
                  </div>
`;

code = code.replace(
  /<button \n                      type="submit"\n                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg text-sm"\n                    >/g,
  togglesUI + `                    <button 
                      type="submit"
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg text-sm"
                    >`
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
