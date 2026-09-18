const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  "{activeTab === 'users' && userRole === 'admin' && (\\n          <div className=\"lg:col-span-12\">\\n            <UserManagement />\\n          </div>\\n        )}",
  "{activeTab === 'users' && userRole === 'admin' && (\n          <div className=\"lg:col-span-12\">\n            <UserManagement />\n          </div>\n        )}\n        {activeTab === 'courier' && (\n          <div className=\"lg:col-span-12\">\n            <DelhiveryCourier />\n          </div>\n        )}"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
