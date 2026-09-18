const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const styledEmailRoute = `
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

    let footerHtml = '';
    if (footer && Array.isArray(footer)) {
      footerHtml = footer.map(f => \`<div style="margin-top: 20px;"><h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 14px;">\${f.title}</h4><p style="margin: 0; font-size: 14px; color: #9ca3af;">\${f.desc}</p></div>\`).join('');
    }

    await transporter.sendMail({
      from: smtpUser,
      to: email,
      subject: subject || title || 'Krishna Homoeopathic Clinic',
      html: \`
      <div style="font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
        <h1 style="color: #0d9488; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; letter-spacing: 1px;">Krishna Homoeopathic Clinic</h1>
        \${title ? \`<h2 style="font-size: 24px; margin-bottom: 20px; color: #ffffff;">\${title}</h2>\` : ''}
        \${heading ? \`<p style="font-size: 16px; line-height: 1.5; margin-bottom: 12px; color: #d1d5db;">\${heading}</p>\` : ''}
        \${body ? \`<p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">\${body}</p>\` : ''}
        \${highlight ? \`<div style="background-color: #0d9488; color: #ffffff; padding: 16px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 24px;">\${highlight}</div>\` : ''}
        \${footerHtml ? \`<div style="border-top: 1px solid #374151; padding-top: 20px; margin-top: 20px;">\${footerHtml}</div>\` : ''}
      </div>
    \`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to send styled email", error);
    res.status(500).json({ error: 'Failed to send styled email' });
  }
});
`;

code = code.replace(
  /app\.post\('\/api\/verify-otp', async \(req, res\) => \{/,
  styledEmailRoute + "\napp.post('/api/verify-otp', async (req, res) => {"
);

fs.writeFileSync('server.ts', code);
