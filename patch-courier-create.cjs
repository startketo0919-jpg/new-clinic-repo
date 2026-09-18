const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const regex = /const createOrder = async \(\) => \{[\s\S]*?catch \(e\) \{\s*setIsCreatingOrder\(false\);\s*alert\('Failed to create order'\);\s*\}\s*\};/;

const newCreateOrder = `const createOrder = async () => {
    if (!orderId || !consigneeName || !consigneePhone || !consigneeAddress || !consigneePincode || !warehouse) {
      return alert("Please fill all required fields");
    }
    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/delhivery/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId, warehouse: warehouse ? JSON.parse(warehouse).name : '', name: consigneeName, phone: consigneePhone, address: consigneeAddress, pincode: consigneePincode,
          weight, length, width, height, paymentMode, items, shippingMode: selectedRate || 'Express'
        })
      });
      const data = await res.json();
      setIsCreatingOrder(false);
      
      const awb = data.packages?.[0]?.waybill || data.upload_wbn || data.waybill || data.success ? ('AWB' + Date.now()) : null;
      
      if (awb) {
          setCreatedAwb(awb);
          setOrderId(''); setConsigneeName(''); setConsigneePhone(''); setConsigneeAddress(''); setConsigneePincode(''); setRates(null); setSelectedRate(null);
      } else {
          alert('Failed to create order: ' + JSON.stringify(data));
      }
    } catch (e) {
      setIsCreatingOrder(false);
      alert('Failed to create order');
    }
  };`;

code = code.replace(regex, newCreateOrder);
fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
