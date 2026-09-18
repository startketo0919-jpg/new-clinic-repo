const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.post\('\/api\/send-otp', async \(req, res\) => \{\s*const \{ email, fullName \} = req\.body;([\s\S]*?)await transporter\.sendMail\(\{\s*from: smtpUser,\s*to: email,\s*subject: 'Your Clinic Check-in OTP',[\s\S]*?\}\);\s*res\.json\(\{ success: true \}\);/;

const replacement = `app.post('/api/send-otp', async (req, res) => {
  const { email, fullName, type } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins

  try {
    const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
    const s = dbSettings[0];
    const smtpHost = s?.smtpHost || process.env.SMTP_HOST || 'smtp.hostinger.com';
    const smtpPort = parseInt(s?.smtpPort || process.env.SMTP_PORT || '465');
    const smtpUser = s?.smtpUser || process.env.SMTP_USER;
    const smtpPass = s?.smtpPass || process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
       return res.status(500).json({ error: 'SMTP credentials not configured in Settings.' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const isLogin = type === 'login';
    const subject = isLogin ? 'Staff Login Verification' : 'Your Clinic Check-in OTP';
    const title = isLogin ? 'Staff Login' : 'Complete your check-in';
    const message = isLogin ? \`Hey \${fullName || 'Staff'},\n<br><br>Use the code below to securely verify your login to the clinic dashboard.\` : \`Hey \${fullName || 'there'},\n<br><br>Use the code below to securely verify your self check-in.\`;

    await transporter.sendMail({
      from: smtpUser,
      to: email,
      subject,
      html: \`
      <div style="font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
        <h1 style="color: #0d9488; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; letter-spacing: 1px;">Krishna Homoeopathic Clinic</h1>
        <h2 style="font-size: 24px; margin-bottom: 20px; color: #ffffff;">\${title}</h2>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">\${message}</p>
        <div style="background-color: #0d9488; color: #ffffff; padding: 16px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin-bottom: 24px;">\${otp}</div>
        <p style="font-size: 14px; color: #9ca3af; border-bottom: 1px solid #374151; padding-bottom: 20px;">This code will expire in 10 minutes.</p>
        \${!isLogin ? \`
        <div style="margin-top: 30px; margin-bottom: 20px; text-align: center;">
          <a href="https://drsunilkumarbhms.in" style="background-color: #0d9488; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 10px;">Visit Clinic Website</a>
          <a href="tel:5676350536" style="background-color: #1f2937; border: 1px solid #374151; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-left: 10px;">Call Now</a>
        </div>\` : ''}
        <div style="margin-top: 20px;"><h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 14px;">Secure verification</h4><p style="margin: 0; font-size: 14px; color: #9ca3af;">Use this email address to securely sign in anywhere.</p></div>
      </div>
    \`
    });
    res.json({ success: true });`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
