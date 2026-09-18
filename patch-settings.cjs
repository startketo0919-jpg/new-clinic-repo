const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

code = code.replace(
  "const [newWarehouse, setNewWarehouse] = useState('');",
  "const [newWarehouseName, setNewWarehouseName] = useState('');\n  const [newWarehousePincode, setNewWarehousePincode] = useState('');"
);

const oldInput = '<input type="text" placeholder="Add Warehouse Name (e.g. Clinic Delhi)" className="flex-1 px-4 py-2 border rounded-lg text-sm" value={newWarehouse} onChange={e => setNewWarehouse(e.target.value)} />';
const newInput = '<input type="text" placeholder="Warehouse Name" className="flex-1 px-4 py-2 border rounded-lg text-sm" value={newWarehouseName} onChange={e => setNewWarehouseName(e.target.value)} />\n          <input type="text" placeholder="Pincode" className="w-32 px-4 py-2 border rounded-lg text-sm" value={newWarehousePincode} onChange={e => setNewWarehousePincode(e.target.value)} />';

code = code.replace(oldInput, newInput);

const oldAdd = `if (!newWarehouse) return;
            const warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');
            if (!warehouses.includes(newWarehouse)) {
              warehouses.push(newWarehouse);
              updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });
              
            }
            setNewWarehouse('');`;
const newAdd = `if (!newWarehouseName || !newWarehousePincode) return;
            const warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');
            if (!warehouses.some((w) => w.name === newWarehouseName || w === newWarehouseName)) {
              warehouses.push({ name: newWarehouseName, pincode: newWarehousePincode });
              updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });
            }
            setNewWarehouseName('');
            setNewWarehousePincode('');`;

code = code.replace(oldAdd, newAdd);

const oldList = `{JSON.parse(state.settings.delhiveryWarehouses || '[]').map((wh, idx) => (
             <div key={idx} className="flex justify-between items-center bg-white px-3 py-2 border rounded-lg text-sm shadow-sm">
               <span>{wh}</span>
               <button onClick={() => {
                 let warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');
                 warehouses = warehouses.filter(w => w !== wh);
                 updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });
                 
               }} className="text-red-500 hover:text-red-700 font-medium">Remove</button>
             </div>
          ))}`;
const newList = `{JSON.parse(state.settings.delhiveryWarehouses || '[]').map((wh: any, idx: number) => {
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
          })}`;

code = code.replace(oldList, newList);

fs.writeFileSync('src/pages/SettingsPage.tsx', code);
