const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Update the OTP email to be styled
code = code.replace(
  "text: `Your OTP for self check-in is: ${otp}. It is valid for 10 minutes.`",
  "html: `\n      <div style=\"font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;\">\n        <h1 style=\"color: #0d9488; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; letter-spacing: 1px;\">CareSync Clinic</h1>\n        <h2 style=\"font-size: 24px; margin-bottom: 20px; color: #ffffff;\">Complete your check-in</h2>\n        <p style=\"font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;\">Hey there,<br><br>Welcome back! Use the code below to securely verify your self check-in.</p>\n        <div style=\"background-color: #0d9488; color: #ffffff; padding: 16px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin-bottom: 24px;\">${otp}</div>\n        <p style=\"font-size: 14px; color: #9ca3af; border-bottom: 1px solid #374151; padding-bottom: 20px;\">This code will expire in 10 minutes.</p>\n        <div style=\"margin-top: 20px;\"><h4 style=\"margin: 0 0 5px 0; color: #ffffff; font-size: 14px;\">Secure verification</h4><p style=\"margin: 0; font-size: 14px; color: #9ca3af;\">Use this email address to securely sign in anywhere.</p></div>\n      </div>\n    `"
);

fs.writeFileSync('server.ts', code);
