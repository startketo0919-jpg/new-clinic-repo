const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const actionButtons = `
        <div style="margin-top: 30px; margin-bottom: 20px; display: flex; gap: 15px; justify-content: center;">
          <a href="https://drsunilkumarbhms.in" style="background-color: #0d9488; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Visit Clinic Website</a>
          <a href="tel:5676350536" style="background-color: #1f2937; border: 1px solid #374151; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Call Now</a>
        </div>
`;

// Patch OTP endpoint
code = code.replace(
  /<p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">Hey \$\{fullName \|\| 'there'\},<br><br>Welcome back! Use the code below to securely verify your self check-in\.<\/p>/g,
  `<p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">Hey \${fullName || 'there'},<br><br>Use the code below to securely verify your self check-in.</p>`
);

// We need to inject actionButtons in OTP email, right above the expiration text
code = code.replace(
  /<p style="font-size: 14px; color: #9ca3af; border-bottom: 1px solid #374151; padding-bottom: 20px;">This code will expire in 10 minutes\.<\/p>/g,
  `<p style="font-size: 14px; color: #9ca3af; border-bottom: 1px solid #374151; padding-bottom: 20px;">This code will expire in 10 minutes.</p>\n        ` + actionButtons
);

// Patch send-styled-email endpoint
code = code.replace(
  /\$\{footerHtml \? `<div style="border-top: 1px solid #374151; padding-top: 20px; margin-top: 20px;">\$\{footerHtml\}<\/div>` : ''\}/g,
  `\${footerHtml ? \`<div style="border-top: 1px solid #374151; padding-top: 20px; margin-top: 20px;">\${footerHtml}</div>\` : ''}\n        ` + actionButtons
);

// also in server.ts action ADD_PATIENT we might need to sync the boolean fields when settings are updated.
// Let's check UPDATE_SETTINGS inside server.ts action handler

fs.writeFileSync('server.ts', code);
