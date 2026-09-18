const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// I will create an endpoint for sending styled emails
const newMailEndpoint = `
app.post('/api/send-styled-email', async (req, res) => {
  const { email, subject, title, heading, body, highlight, footer } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

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

    const html = \`
    <div style="font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
      <h1 style="color: #0d9488; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; letter-spacing: 1px;">CareSync Clinic</h1>
      
      <h2 style="font-size: 24px; margin-bottom: 20px; color: #ffffff;">\${title}</h2>
      
      <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">
        \${heading}<br><br>
        \${body}
      </p>
      
      \${highlight ? \`
      <div style="background-color: #0d9488; color: #ffffff; padding: 16px; text-align: center; border-radius: 8px; font-size: 20px; font-weight: bold; margin-bottom: 24px;">
        \${highlight}
      </div>\` : ''}
      
      <div style="margin-top: 30px; border-top: 1px solid #374151; padding-top: 20px;">
        \${footer ? footer.map(f => \`
          <div style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 14px;">\${f.title}</h4>
            <p style="margin: 0; font-size: 14px; color: #9ca3af;">\${f.desc}</p>
          </div>
        \`).join('') : ''}
      </div>
    </div>
    \`;

    await transporter.sendMail({
      from: smtpUser,
      to: email,
      subject: subject || 'Update from CareSync Clinic',
      html,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

`;

// We also need to add node-cron for the 9:30 AM job. But wait, I'll install it first if it isn't there, or I can just use setInterval and Date checking to avoid adding a heavy dependency.
const schedulerScript = `
// Basic scheduler for 9:30 AM reminders
setInterval(async () => {
  const now = new Date();
  // Check if it's 09:30 AM in the local timezone
  if (now.getHours() === 9 && now.getMinutes() === 30) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = await db.select().from(appointments).where(eq(appointments.date, today));
      
      // We need smtp configs
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      const smtpUser = s?.smtpUser || process.env.SMTP_USER;
      const smtpPass = s?.smtpPass || process.env.SMTP_PASS;
      
      if (!smtpUser || !smtpPass) return;
      
      const transporter = nodemailer.createTransport({
        host: s?.smtpHost || process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: parseInt(s?.smtpPort || process.env.SMTP_PORT || '465'),
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
      });

      for (const app of todayAppointments) {
        if (app.email) {
          const html = \`
            <div style="font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
              <h1 style="color: #0d9488; margin-bottom: 20px;">CareSync Clinic</h1>
              <h2 style="font-size: 24px; margin-bottom: 20px;">Reminder: Appointment Today</h2>
              <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">
                Hello \${app.fullName},<br><br>
                Just a friendly reminder that you have an appointment with us today.
              </p>
            </div>
          \`;
          await transporter.sendMail({
            from: smtpUser,
            to: app.email,
            subject: 'Reminder: Your Clinic Appointment Today',
            html
          });
        }
      }
    } catch(err) {
      console.error('Scheduled job error:', err);
    }
  }
}, 60000); // Check every minute
`;

// Insert the new code before app.listen
code = code.replace(
  /app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{/,
  newMailEndpoint + "\n" + schedulerScript + "\n  app.listen(PORT, \"0.0.0.0\", () => {"
);

fs.writeFileSync('server.ts', code);
