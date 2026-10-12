const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

code = code.replace(
  /\{JSON\.parse\(state\.settings\.delhiveryWarehouses \|\| '\[\]'\)\.map\(\(wh, idx\) => \(\s*<div key=\{idx\} className="flex justify-between items-center bg-white px-3 py-2 border rounded-lg text-sm shadow-sm">\s*<span>\{wh\}<\/span>\s*<button onClick=\{\(\) => \{\s*let warehouses = JSON\.parse\(state\.settings\.delhiveryWarehouses \|\| '\[\]'\);\s*warehouses = warehouses\.filter\(w => w !== wh\);\s*updateSettings\(\{ delhiveryWarehouses: JSON\.stringify\(warehouses\) \}\);\s*;\s*\}\} className="text-red-500 hover:text-red-700 font-medium">Remove<\/button>\s*<\/div>\s*\)\)\}/m,
  `{JSON.parse(state.settings.delhiveryWarehouses || '[]').map((wh: any, idx: number) => {
             const wName = typeof wh === 'string' ? wh : wh.name;
             const wPin = typeof wh === 'string' ? '' : wh.pincode;
             return (
             <div key={idx} className="flex justify-between items-center bg-white px-3 py-2 border rounded-lg text-sm shadow-sm">
               <span>{wName} {wPin ? \`(\${wPin})\` : ''}</span>
               <button onClick={() => {
                 let warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');
                 warehouses = warehouses.filter((_: any, i: number) => i !== idx);
                 updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });
               }} className="text-red-500 hover:text-red-700 font-medium">Remove</button>
             </div>
             )
          })}`
);

fs.writeFileSync('src/pages/SettingsPage.tsx', code);
