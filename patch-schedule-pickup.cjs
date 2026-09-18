const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const regex = /const schedulePickup = async \(\) => \{([\s\S]*?)const data = await res\.json\(\);\s*setPickupStatus\("Pickup request generated successfully\."\);\s*\} catch \(e\) \{\s*setPickupStatus\("Failed to schedule pickup\."\);\s*\}/;

const replacement = `const schedulePickup = async () => {
    try {
      const res = await fetch('/api/delhivery/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_time: pickupTime,
          pickup_date: pickupDate,
          pickup_location: warehouse ? JSON.parse(warehouse).name : '',
          expected_package_count: pickupPackages
        })
      });
      const data = await res.json();
      if (data.pickup_id || data.pr_id) {
          const pid = data.pickup_id || data.pr_id;
          const date = data._scheduled_date || pickupDate;
          const time = data._scheduled_time || pickupTime;
          setPickupStatus(\`Pickup scheduled successfully! ID: \${pid} | Date: \${date} | Time: \${time}\`);
      } else if (data.error) {
          setPickupStatus(\`Failed to schedule pickup: \${data.message || data.error}\`);
      } else {
          setPickupStatus("Pickup request generated successfully.");
      }
    } catch (e) {
      setPickupStatus("Failed to schedule pickup.");
    }`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
