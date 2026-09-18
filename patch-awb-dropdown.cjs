const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

code = code.replace(
  "if (activeTab === 'history') {",
  "if (activeTab === 'history' || activeTab === 'manage') {"
);

const manageHtml = `
              <h3 className="font-bold text-slate-700 mb-6">Manage Order (AWB)</h3>
              <div className="flex flex-col gap-3 mb-6">
                <input 
                  type="text" 
                  list="saved-awbs"
                  value={manageAwb} 
                  onChange={e => setManageAwb(e.target.value)} 
                  placeholder="Enter or select saved AWB Number..." 
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-lg" 
                />
                <datalist id="saved-awbs">
                  {history.map(h => (
                    <option key={h.awb} value={h.awb}>{h.consigneeName} - {h.orderId} ({new Date(h.timestamp).toLocaleDateString()})</option>
                  ))}
                </datalist>
              </div>
`;

code = code.replace(
  /<h3 className="font-bold text-slate-700 mb-6">Manage Order \(AWB\)<\/h3>\s*<div className="flex gap-3 mb-6">\s*<input type="text" value=\{manageAwb\} onChange=\{e => setManageAwb\(e\.target\.value\)\} placeholder="Enter AWB Number\.\.\." className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-lg" \/>\s*<\/div>/,
  manageHtml
);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
