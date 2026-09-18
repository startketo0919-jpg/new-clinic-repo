const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const oldFetchRates = `  const fetchRates = async () => {
    if (!warehouse || !consigneePincode) return alert("Select warehouse and enter delivery pincode");
    setIsFetchingRates(true);
    try {
      // Typically need pickup pincode too, but assume we get both Express and Surface rates
      // Simulating a backend call that returns both
      const res = await fetch('/api/delhivery/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup_pincode: warehouse ? JSON.parse(warehouse).pincode : '', delivery_pincode: consigneePincode, weight, mode: 'Express' })
      });
      
      // A full integration would parse exact rates from the Delhivery Invoice API
      // Here we simulate for UX (or use actual if backend succeeds)
      setTimeout(() => {
        setRates({ express: 250, surface: 150 }); // Mocked UX as per prompt: "Fetch Express and surface rates and user can choose any one"
        setIsFetchingRates(false);
      }, 1000);
    } catch (e) {
      setIsFetchingRates(false);
      alert('Failed to fetch rates');
    }
  };`;

const newFetchRates = `  const fetchRates = async () => {
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
      
      if (Array.isArray(data.express) && data.express.length > 0) expPrice = data.express[0].total_amount;
      else if (data.express && data.express[0] && data.express[0].total_amount) expPrice = data.express[0].total_amount;
      
      if (Array.isArray(data.surface) && data.surface.length > 0) surPrice = data.surface[0].total_amount;
      else if (data.surface && data.surface[0] && data.surface[0].total_amount) surPrice = data.surface[0].total_amount;
      
      if (!expPrice && !surPrice) {
        alert("Could not fetch rates. Please check the pincodes, weight, or your API key.");
        setIsFetchingRates(false);
        return;
      }
      
      setRates({ express: expPrice, surface: surPrice });
      setIsFetchingRates(false);
    } catch (e) {
      setIsFetchingRates(false);
      alert('Failed to fetch rates');
    }
  };`;

code = code.replace(oldFetchRates, newFetchRates);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
