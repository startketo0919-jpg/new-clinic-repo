const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /app\.post\('\/api\/send-otp', async \(req, res\) => \{\n\s*const \{ email \} = req\.body;/,
  `app.post('/api/send-otp', async (req, res) => {
  const { email, fullName } = req.body;`
);

code = code.replace(
  /Hey there,<br><br>Welcome back! Use the code below to securely verify your self check-in\./,
  `Hey \${fullName || 'there'},<br><br>Welcome back! Use the code below to securely verify your self check-in.`
);

fs.writeFileSync('server.ts', code);
