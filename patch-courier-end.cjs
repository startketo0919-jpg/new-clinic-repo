const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

code = code.replace(
  "          </div>\n        )}\n\n        {activeTab === 'pickup' && (",
  "          </div>\n          )\n        )}\n\n        {activeTab === 'pickup' && ("
);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
