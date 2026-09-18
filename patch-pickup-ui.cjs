const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

code = code.replace(
  "const time = data._scheduled_time || pickupTime;",
  "const time = (data._scheduled_time || pickupTime) === '10:00:00' ? 'Morning (10:00-14:00)' : (data._scheduled_time || pickupTime) === '14:00:00' ? 'Afternoon (14:00-18:00)' : data._scheduled_time || pickupTime;"
);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
