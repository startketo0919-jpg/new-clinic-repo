const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const regex = /<button onClick=\{\(\) => \{\s*const url = \`https:\/\/track\.delhivery\.com\/api\/p\/packagelabels\?waybills=\$\{createdAwb\}\`;\s*navigator\.clipboard\.writeText\(url\);\s*alert\('Label URL copied to clipboard!'\);\s*\}\} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">\s*<Copy size=\{18\} \/>\s*Copy Label URL\s*<\/button>/m;

const newButtons = `<button onClick={() => {
                  const url = \`\${window.location.origin}/api/delhivery/label/\${createdAwb}.pdf\`;
                  navigator.clipboard.writeText(url);
                  alert('Label URL copied to clipboard!');
                }} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                  <Copy size={18} />
                  Copy URL
                </button>
                <button onClick={() => {
                  const url = \`\${window.location.origin}/api/delhivery/label/\${createdAwb}.pdf\`;
                  window.open(url, '_blank');
                }} className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                  <Download size={18} />
                  Download PDF
                </button>`;

code = code.replace(regex, newButtons);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
