const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

const oldAddBlock = `          <button onClick={() => {
            if (!newWarehouse) return;
            const warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');
            if (!warehouses.includes(newWarehouse)) {
              warehouses.push(newWarehouse);
              updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });
              ;
            }
            setNewWarehouse('');
          }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Add</button>`;

const newAddBlock = `          <button onClick={() => {
            if (!newWarehouseName || !newWarehousePincode) return;
            const warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');
            if (!warehouses.some((w: any) => (w.name || w) === newWarehouseName)) {
              warehouses.push({ name: newWarehouseName, pincode: newWarehousePincode });
              updateSettings({ delhiveryWarehouses: JSON.stringify(warehouses) });
            }
            setNewWarehouseName('');
            setNewWarehousePincode('');
          }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Add</button>`;

code = code.replace(oldAddBlock, newAddBlock);

// if not replaced because of spacing, let's use regex
if (code.includes('if (!newWarehouse) return;')) {
    code = code.replace(/<button onClick=\{\(\) => \{\s*if \(!newWarehouse\) return;\s*const warehouses = JSON\.parse\(state\.settings\.delhiveryWarehouses \|\| '\[\]'\);\s*if \(!warehouses\.includes\(newWarehouse\)\) \{\s*warehouses\.push\(newWarehouse\);\s*updateSettings\(\{ delhiveryWarehouses: JSON\.stringify\(warehouses\) \}\);\s*;\s*\}\s*setNewWarehouse\(''\);\s*\}\} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Add<\/button>/, newAddBlock);
}

fs.writeFileSync('src/pages/SettingsPage.tsx', code);
