const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

code = code.replace(
  /<option value="new_patient">When added to today's waiting queue<\/option>/,
  `<option value="new_patient">When added to today's waiting queue</option>
                        <option value="pid_generated">When a new Patient ID (PID) is generated</option>`
);

code = code.replace(
  /<option value="next_in_queue">When patient status moves to 'In Room'<\/option>/,
  `<option value="next_in_queue">When patient is next in line (previous patient entered cabin)</option>`
);

fs.writeFileSync('src/pages/SettingsPage.tsx', code);
