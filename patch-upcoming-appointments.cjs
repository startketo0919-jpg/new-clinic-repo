const fs = require('fs');
let code = fs.readFileSync('src/components/UpcomingAppointments.tsx', 'utf8');

code = code.replace(
  /const \{ state, cancelAppointment, addPatient \} = useClinic\(\);/,
  `const { state, cancelAppointment, approveAppointment } = useClinic();`
);

code = code.replace(
  /const handleApprove = \(app: any\) => \{[\s\S]*?\};\n/,
  `const handleApprove = (app: any) => {
    approveAppointment(app);
  };
`
);

fs.writeFileSync('src/components/UpcomingAppointments.tsx', code);
