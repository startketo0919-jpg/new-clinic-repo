const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Remove settings logic and modal
code = code.replace(/const \[showSettings, setShowSettings\] = useState\(false\);[\s\S]*?const handleResetDB = \(\) => \{[\s\S]*?\n\s*\};\n/, '');
code = code.replace(/\{\/\* Settings Modal\/Dropdown \*\/\}[\s\S]*?\{\/\* Main Content \*\/\}/, '{/* Main Content */}');

// Link settings button to route
code = code.replace(
  /onClick=\{\(\) => setShowSettings\(!showSettings\)\}/,
  `onClick={() => navigate('/settings')}`
);

// 2. Update metrics calculation
code = code.replace(
  /const totalPatients = todayPatients\.length;/,
  `const totalPatients = todayPatients.length;
  const currentlyWaiting = todayPatients.filter(p => p.status === 'Waiting').length;
  const patientsWaitingApproval = state.appointments.filter(a => isSameDayLocal(a.date)).length;`
);

// 3. Update MetricBoxes
code = code.replace(
  /<MetricBox icon=\{Users\} label="Total" value=\{totalPatients\} color="text-blue-600" bg="bg-blue-50" \/>/,
  `<MetricBox icon={Users} label="Waiting Now" value={currentlyWaiting} color="text-blue-600" bg="bg-blue-50" />
   <MetricBox icon={Calendar} label="Pending Approval" value={patientsWaitingApproval} color="text-indigo-600" bg="bg-indigo-50" />`
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
