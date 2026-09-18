const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const regex = /\{activeTab === 'new_order' && \(\s*<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">/;

const newBlock = `{activeTab === 'new_order' && (
          createdAwb ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Order Manifested!</h3>
              <p className="text-slate-600 mb-6">Your order has been successfully created with Delhivery.</p>
              
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wide">AWB Number</p>
                <div className="text-3xl font-bold text-indigo-700 tracking-wider font-mono">{createdAwb}</div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button onClick={() => {
                  const url = \`https://track.delhivery.com/api/p/packagelabels?waybills=\${createdAwb}\`;
                  navigator.clipboard.writeText(url);
                  alert('Label URL copied to clipboard!');
                }} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                  <Copy size={18} />
                  Copy Label URL
                </button>
                <button onClick={() => setCreatedAwb(null)} className="px-6 py-3 bg-white text-slate-700 border border-slate-300 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Create Another
                </button>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">`;

code = code.replace(regex, newBlock);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
