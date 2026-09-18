const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  "useState<'queue' | 'history' | 'users' | 'appointments'>('queue');",
  "useState<'queue' | 'history' | 'users' | 'appointments' | 'courier'>('queue');"
);

code = code.replace(
  "import { Users, Clock, LogOut, CheckCircle2, History, Settings, Calendar, UserCog } from 'lucide-react';",
  "import { Users, Clock, LogOut, CheckCircle2, History, Settings, Calendar, UserCog, Package } from 'lucide-react';"
);

// Add Tab Button
code = code.replace(
  "{userRole === 'admin' && (",
  `<button
    onClick={() => setActiveTab('courier')}
    className={\`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 \${
      activeTab === 'courier' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
    }\`}
  >
    <Package className="w-4 h-4" /> Courier
  </button>
  {userRole === 'admin' && (`
);

// Add Tab Rendering
code = code.replace(
  "{activeTab === 'users' && userRole === 'admin' && <UserManagement />}",
  `{activeTab === 'users' && userRole === 'admin' && <UserManagement />}
   {activeTab === 'courier' && <DelhiveryCourier />}`
);

// Add import for Courier component
code = code.replace(
  "import UserManagement from '../components/UserManagement';",
  "import UserManagement from '../components/UserManagement';\nimport DelhiveryCourier from '../components/DelhiveryCourier';"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
