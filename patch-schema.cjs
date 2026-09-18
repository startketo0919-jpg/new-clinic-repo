const fs = require('fs');

// Patch types.ts
let types = fs.readFileSync('src/types.ts', 'utf8');
types = types.replace(
  /smtpPass\?: string;\n  \};\n  templates: WhatsAppTemplate\[\];/,
  `smtpPass?: string;
    emailAutoNewPid?: boolean;
    emailAutoApptConfirmed?: boolean;
    emailAutoNextInQueue?: boolean;
    emailAutoFollowUp?: boolean;
    emailAutoCheckIn?: boolean;
  };
  templates: WhatsAppTemplate[];`
);
fs.writeFileSync('src/types.ts', types);

// Patch schema.ts
let schema = fs.readFileSync('src/db/schema.ts', 'utf8');
schema = schema.replace(
  /smtpPass: text\("smtp_pass"\)\.default\(""\),\n\}\);/,
  `smtpPass: text("smtp_pass").default(""),
  emailAutoNewPid: boolean("email_auto_new_pid").default(true),
  emailAutoApptConfirmed: boolean("email_auto_appt_confirmed").default(true),
  emailAutoNextInQueue: boolean("email_auto_next_in_queue").default(true),
  emailAutoFollowUp: boolean("email_auto_follow_up").default(true),
  emailAutoCheckIn: boolean("email_auto_check_in").default(true),
});`
);
fs.writeFileSync('src/db/schema.ts', schema);

// Patch Settings.tsx
let context = fs.readFileSync('src/context/ClinicContext.tsx', 'utf8');
context = context.replace(
  /waAutoFollowUp: true,\n\s*smtpHost:/,
  `waAutoFollowUp: true,
    emailAutoNewPid: true,
    emailAutoApptConfirmed: true,
    emailAutoNextInQueue: true,
    emailAutoFollowUp: true,
    emailAutoCheckIn: true,
    smtpHost:`
);

context = context.replace(
  /waAutoFollowUp: data\.settings\?.waAutoFollowUp \?\? true,\n\s*smtpHost:/,
  `waAutoFollowUp: data.settings?.waAutoFollowUp ?? true,
          emailAutoNewPid: data.settings?.emailAutoNewPid ?? true,
          emailAutoApptConfirmed: data.settings?.emailAutoApptConfirmed ?? true,
          emailAutoNextInQueue: data.settings?.emailAutoNextInQueue ?? true,
          emailAutoFollowUp: data.settings?.emailAutoFollowUp ?? true,
          emailAutoCheckIn: data.settings?.emailAutoCheckIn ?? true,
          smtpHost:`
);

fs.writeFileSync('src/context/ClinicContext.tsx', context);
