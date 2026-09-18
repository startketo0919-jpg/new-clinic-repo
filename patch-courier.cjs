const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const oldParse = "const warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]');";
const newParse = "const warehouses = JSON.parse(state.settings.delhiveryWarehouses || '[]').map((w: any) => typeof w === 'string' ? { name: w, pincode: '' } : w);";

code = code.replace(oldParse, newParse);

const oldUseEffect = `useEffect(() => {
    if (!warehouse && warehouses.length > 0) {
      setWarehouse(warehouses[0]);
    }
  }, [warehouses, warehouse]);`;
const newUseEffect = `useEffect(() => {
    if (!warehouse && warehouses.length > 0) {
      setWarehouse(JSON.stringify(warehouses[0]));
    }
  }, [warehouses, warehouse]);`;
  
code = code.replace(oldUseEffect, newUseEffect);

// In new order tab options
code = code.replace(
  "{warehouses.map((w: string, i: number) => <option key={i} value={w}>{w}</option>)}",
  "{warehouses.map((w: any, i: number) => <option key={i} value={JSON.stringify(w)}>{w.name} {w.pincode ? `(${w.pincode})` : ''}</option>)}"
);

// In pickup tab options
code = code.replace(
  "{warehouses.map((w: string, i: number) => <option key={i} value={w}>{w}</option>)}",
  "{warehouses.map((w: any, i: number) => <option key={i} value={JSON.stringify(w)}>{w.name} {w.pincode ? `(${w.pincode})` : ''}</option>)}"
);

// In fetchRates
const oldFetchRatesBody = `body: JSON.stringify({ delivery_pincode: consigneePincode, weight, mode: 'Express' })`;
const newFetchRatesBody = `body: JSON.stringify({ pickup_pincode: warehouse ? JSON.parse(warehouse).pincode : '', delivery_pincode: consigneePincode, weight, mode: 'Express' })`;
code = code.replace(oldFetchRatesBody, newFetchRatesBody);

// In createOrder
const oldCreateOrderBody = `orderId, warehouse, name: consigneeName, phone: consigneePhone, address: consigneeAddress, pincode: consigneePincode,
          weight, length, width, height, paymentMode, items, shippingMode: selectedRate || 'Express'`;
const newCreateOrderBody = `orderId, warehouse: warehouse ? JSON.parse(warehouse).name : '', name: consigneeName, phone: consigneePhone, address: consigneeAddress, pincode: consigneePincode,
          weight, length, width, height, paymentMode, items, shippingMode: selectedRate || 'Express'`;
code = code.replace(oldCreateOrderBody, newCreateOrderBody);

// In schedulePickup
const oldPickupBody = `pickup_location: warehouse,`;
const newPickupBody = `pickup_location: warehouse ? JSON.parse(warehouse).name : '',`;
code = code.replace(oldPickupBody, newPickupBody);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
