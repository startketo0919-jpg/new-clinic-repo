const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

const newOptions = `
                        <option value="new_patient">When added to today's waiting queue</option>
                        <option value="pid_generated">When a new Patient ID (PID) is generated</option>
                        <option value="pid_generated_self">When a new PID is generated (Self Check-in)</option>
                        <option value="pid_generated_staff">When a new PID is generated (Staff Check-in)</option>
                        <option value="queue_old_self">When an OLD patient joins queue (Self Check-in)</option>
                        <option value="queue_new_self">When a NEW patient joins queue (Self Check-in)</option>
                        <option value="queue_old_staff">When an OLD patient joins queue (Staff Check-in)</option>
                        <option value="queue_new_staff">When a NEW patient joins queue (Staff Check-in)</option>
                        <option value="appointment_scheduled">When future appointment is requested</option>
                        <option value="appointment_approved">When appointment is approved for today</option>
                        <option value="next_in_queue">When patient is next in line (previous patient entered cabin)</option>
                        <option value="follow_up">When follow-up date is set</option>
`;

code = code.replace(
  /<option value="new_patient">When added to today's waiting queue<\/option>[\s\S]*?<option value="follow_up">When follow-up date is set<\/option>/,
  newOptions.trim()
);

fs.writeFileSync('src/pages/SettingsPage.tsx', code);
