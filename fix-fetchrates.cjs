const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const regex = /const fetchRates = async \(\) => \{[\s\S]*?catch \(e\) \{\s*setIsFetchingRates\(false\);\s*alert\('Failed to fetch rates'\);\s*\}\s*\};/;

const newFetchRates = `const fetchRates = async () => {
    if (!warehouse || !consigneePincode) return alert("Select warehouse and enter delivery pincode");
    setIsFetchingRates(true);
    try {
      const w = JSON.parse(warehouse);
      const res = await fetch('/api/delhivery/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup_pincode: w.pincode, delivery_pincode: consigneePincode, weight })
      });
      const data = await res.json();
      
      let expPrice = 0;
      let surPrice = 0;
      
      console.log('Delhivery rates response:', data);

      if (Array.isArray(data.express) && data.express.length > 0) expPrice = data.express[0].total_amount;
      else if (data.express && data.express[0] && data.express[0].total_amount) expPrice = data.express[0].total_amount;
      
      if (Array.isArray(data.surface) && data.surface.length > 0) surPrice = data.surface[0].total_amount;
      else if (data.surface && data.surface[0] && data.surface[0].total_amount) surPrice = data.surface[0].total_amount;
      
      if (!expPrice && !surPrice) {
        alert("Could not fetch rates. Please check the pincodes, weight, or your API key. (See console for details)");
        setIsFetchingRates(false);
        return;
      }
      
      setRates({ express: expPrice, surface: surPrice });
      setIsFetchingRates(false);
    } catch (e) {
      console.error(e);
      setIsFetchingRates(false);
      alert('Failed to fetch rates');
    }
  };`;

code = code.replace(regex, newFetchRates);
fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
