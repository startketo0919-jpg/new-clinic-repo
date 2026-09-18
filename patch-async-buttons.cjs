const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const regex = /<button onClick=\{\(\) => \{\s*const url = \`\$\{window\.location\.origin\}\/api\/delhivery\/label\/\$\{createdAwb\}\.pdf\`;\s*navigator\.clipboard\.writeText\(url\);\s*alert\('Label URL copied to clipboard!'\);\s*\}\} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">\s*<Copy size=\{18\} \/>\s*Copy URL\s*<\/button>\s*<button onClick=\{\(\) => \{\s*const url = \`\$\{window\.location\.origin\}\/api\/delhivery\/label\/\$\{createdAwb\}\.pdf\`;\s*window\.open\(url, '_blank'\);\s*\}\} className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">\s*<Download size=\{18\} \/>\s*Download PDF\s*<\/button>/m;

const newButtons = `<button onClick={async () => {
                  try {
                    const res = await fetch(\`/api/delhivery/label-url/\${createdAwb}\`);
                    const data = await res.json();
                    if (data.url) {
                        navigator.clipboard.writeText(data.url);
                        alert('Label URL copied to clipboard!');
                    } else {
                        alert('Could not fetch label URL.');
                    }
                  } catch(e) {
                      alert('Error fetching label URL');
                  }
                }} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                  <Copy size={18} />
                  Copy URL
                </button>
                <button onClick={async () => {
                  try {
                    const res = await fetch(\`/api/delhivery/label-url/\${createdAwb}\`);
                    const data = await res.json();
                    if (data.url) {
                        if (data.url.startsWith('data:')) {
                            const a = document.createElement('a');
                            a.href = data.url;
                            a.download = \`\${createdAwb}.pdf\`;
                            a.click();
                        } else {
                            window.open(data.url, '_blank');
                        }
                    } else {
                        alert('Could not fetch label PDF.');
                    }
                  } catch(e) {
                      alert('Error fetching label PDF');
                  }
                }} className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                  <Download size={18} />
                  Download PDF
                </button>`;

code = code.replace(regex, newButtons);
fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
