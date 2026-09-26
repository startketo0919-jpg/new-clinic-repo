import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { db, pool } from "./src/db/index.js";
import { initDb } from "./src/db/init.js";
import { hashPassword, verifyPassword, generateAuthToken, verifyAuthToken } from "./src/db/auth-utils.js";
import { liveQueue, patientRegistry, users, appointments, settings, whatsappMessages, whatsappTemplates, delhiveryOrders, patientShipments, onlineAppointments, appointmentFiles, rescheduleOtps } from "./src/db/schema.js";
import { eq, desc, asc, and } from "drizzle-orm";
import { requireStaffAuth, requireAdminAuth, optionalAuth, AuthRequest } from "./src/middleware/auth.js";
import { 
  getClientIp, 
  securityHeaders, 
  checkLoginRateLimit, 
  recordLoginFailure, 
  clearLoginFailures, 
  checkOtpSendRateLimit, 
  recordOtpSent, 
  recordOtpVerifyFailure, 
  clearOtpVerifyFailures, 
  apiAntiAbuseLimiter 
} from "./src/middleware/security.js";

import { getGoogleAuthUrl, exchangeCodeForTokens, refreshAccessToken, createMeetEvent, deleteMeetEvent, updateMeetEvent } from './src/services/google-meet.js';
import { buildAppointmentConfirmationEmail, buildAppointmentRescheduleEmail, buildStaffNotificationEmail, buildReminderEmail, buildRefundEmail, buildRescheduleOtpEmail } from './src/services/email-templates.js';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error("Failed to auto-init database:", err);
  }

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.set('trust proxy', 1);
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use("/api", apiAntiAbuseLimiter);
  app.use(cors());
  app.use(express.json());

  // File upload config for appointment reports
  const uploadDir = path.join(process.cwd(), 'uploads', 'reports');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const reportUpload = multer({
    dest: uploadDir,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB total
    fileFilter: (req, file, cb) => {
      const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      cb(null, allowed.includes(file.mimetype));
    }
  });

  let clients: express.Response[] = [];
  const notifyClients = () => {
    clients.forEach(client => client.write(`data: update\n\n`));
  };

  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    clients.push(res);
    req.on("close", () => {
      clients = clients.filter(client => client !== res);
    });
  });

  app.get("/api/state", async (req, res) => {
    try {
      const dbPatients = await db.select().from(liveQueue).orderBy(asc(liveQueue.sortOrder), asc(liveQueue.checkInTime));
      const dbRegistry = await db.select().from(patientRegistry);
      const dbAppointments = await db.select().from(appointments);
      const dbShipments = await db.select().from(patientShipments).orderBy(desc(patientShipments.createdAt));
      const dbMessages = await db.select().from(whatsappMessages).orderBy(whatsappMessages.timestamp);
      const dbTemplates = await db.select().from(whatsappTemplates);
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      let dbUsers = await db.select().from(users);

      const parseDate = (d: any): number => {
        if (!d) return Date.now();
        const time = new Date(d).getTime();
        return isNaN(time) ? Date.now() : time;
      };

      const parseOptionalDate = (d: any): number | undefined => {
        if (!d) return undefined;
        const time = new Date(d).getTime();
        return isNaN(time) ? undefined : time;
      };

      res.json({
        patients: dbPatients.map(p => ({ 
          ...p, 
          checkInTime: parseDate(p.checkInTime), 
          completedTime: parseOptionalDate(p.completedTime) 
        })),
        patientRegistry: dbRegistry.map(p => ({ 
          ...p, 
          firstVisit: parseDate(p.firstVisit), 
          lastVisited: parseOptionalDate(p.lastVisited), 
          followUpDate: parseOptionalDate(p.followUpDate) 
        })),
        appointments: dbAppointments,
        shipments: dbShipments.map(s => ({ 
          ...s, 
          createdAt: parseDate(s.createdAt), 
          completedAt: parseOptionalDate(s.completedAt) 
        })),
        templates: dbTemplates,
        messages: dbMessages.map(m => ({
          ...m, 
          timestamp: parseDate(m.timestamp)
        })),
        users: dbUsers.map(u => ({ id: u.id, username: u.username, role: u.role, email: u.email })),
        settings: dbSettings[0] || { 
          whatsappApiKey: "", whatsappPhoneId: "", currentPatientId: null, nextSequence: 1,
          waAutoRegisterSameDay: true, waAutoRegisterFuture: true, waAutoQueueAlert: true, waAutoFollowUp: true 
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch state", details: error.message });
    }
  });

  // Diagnostic endpoint to verify MySQL connectivity live
  app.get("/api/db-status", async (req, res) => {
    try {
      const [rows] = await (pool as any).query("SHOW TABLES;");
      const [userCount] = await (pool as any).query("SELECT COUNT(*) as count FROM users;");
      const [queueCount] = await (pool as any).query("SELECT COUNT(*) as count FROM live_queue;");
      const [patientCount] = await (pool as any).query("SELECT COUNT(*) as count FROM patient_registry;");
      const [orderCount] = await (pool as any).query("SELECT COUNT(*) as count FROM delhivery_orders;");

      res.json({
        success: true,
        host: process.env.MYSQL_HOST || 'not configured',
        database: process.env.MYSQL_DATABASE || 'not configured',
        tables: rows,
        counts: {
          users: userCount[0]?.count || 0,
          liveQueue: queueCount[0]?.count || 0,
          patients: patientCount[0]?.count || 0,
          delhiveryOrders: orderCount[0]?.count || 0,
        }
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: err.code,
        host: process.env.MYSQL_HOST || 'not configured',
        database: process.env.MYSQL_DATABASE || 'not configured',
      });
    }
  });
/* Added setup and settings routes */
app.use(express.urlencoded({ extended: true }));

app.get('/setup', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Initial Setup</title></head>
<body>
<h2>Create Superadmin Account</h2>
<form method="POST" action="/setup">
<label>Username: <input type="text" name="username" required /></label><br/>
<label>Email: <input type="email" name="email" required /></label><br/>
<label>Password: <input type="password" name="password" required /></label><br/>
<button type="submit">Create Admin</button>
</form>
</body>
</html>`;
  res.send(html);
});

app.post('/setup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).send('All fields are required.');
  }
  try {
    const hashed = hashPassword(password);
    await pool.query(`
      INSERT INTO users (id, username, password_hash, role, email)
      VALUES ('1', ?, ?, 'admin', ?)
      ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash), role = 'admin', email = VALUES(email);
    `, [username, hashed, email]);
    res.redirect('/login');
  } catch (err: any) {
    console.error('[Setup] Error creating admin:', err);
    res.status(500).send('Failed to create admin.');
  }
});

app.post('/api/settings', optionalAuth, async (req: AuthRequest, res) => {
  const user = req.user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only.' });
  }
  const { whatsappApiKey, whatsappPhoneId } = req.body;
  if (!whatsappApiKey || !whatsappPhoneId) {
    return res.status(400).json({ error: 'Both whatsappApiKey and whatsappPhoneId are required.' });
  }
  try {
    await pool.query(
      `INSERT INTO settings (id, whatsapp_api_key, whatsapp_phone_id)
       VALUES ('default', ?, ?)
       ON DUPLICATE KEY UPDATE whatsapp_api_key = VALUES(whatsapp_api_key), whatsapp_phone_id = VALUES(whatsapp_phone_id);`,
      [whatsappApiKey, whatsappPhoneId]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Settings] Update error:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

  // Diagnostic endpoint to trigger database table creation and inspect output (Protected)
  app.get("/api/init-db", optionalAuth, async (req: AuthRequest, res) => {
    const secret = req.query.secret;
            if (!process.env.SETUP_SECRET) {
              console.error('[InitDB] SETUP_SECRET not set. Exiting.');
              process.exit(1);
            }
            const isAuthorized = (req.user && req.user.role === 'admin') || secret === process.env.SETUP_SECRET;
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Superadmin authentication or valid setup secret required.' });
    }

    try {
      await initDb();
      const [rows] = await (pool as any).query("SHOW TABLES;");
      res.json({
        success: true,
        message: "Database tables initialized successfully",
        tables: rows,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: err.code,
      });
    }
  });

  // Anti-spam in-memory rate limiter: max 5 submissions per 15 minutes per IP
  const ipSubmissionTracker = new Map<string, number[]>();

  app.post('/api/shipments/submit', async (req, res) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      const now = Date.now();

      // 1. Rate Limiting: 5 submissions per 15 mins (900,000 ms)
      const timestamps = ipSubmissionTracker.get(clientIp) || [];
      const recentTimestamps = timestamps.filter(t => now - t < 15 * 60 * 1000);
      if (recentTimestamps.length >= 5) {
        return res.status(429).json({ error: "Too many submissions from this connection. Please wait 15 minutes." });
      }

      const { patientName, phone, email, address, pincode, notes, botField, formLoadTime } = req.body;

      // 2. Honeypot check: botField must be empty
      if (botField) {
        console.warn(`[SPAM DETECTED] Honeypot filled by IP ${clientIp}`);
        return res.json({ success: true, message: "Details submitted successfully." });
      }

      // 3. Time speed check: bots submit too quickly (< 2000 ms)
      if (formLoadTime && (now - Number(formLoadTime)) < 2000) {
        console.warn(`[SPAM DETECTED] Too fast submission from IP ${clientIp}`);
        return res.json({ success: true, message: "Details submitted successfully." });
      }

      // 4. Strict Validation
      if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
        return res.status(400).json({ error: "Please enter a valid Patient Name." });
      }

      const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
      const validPhone = cleanPhone.length === 10 ? cleanPhone : (cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone);
      if (!/^[6-9]\d{9}$/.test(validPhone)) {
        return res.status(400).json({ error: "Please enter a valid 10-digit Indian Mobile Number." });
      }

      if (!address || typeof address !== 'string' || address.trim().length < 8) {
        return res.status(400).json({ error: "Please enter a complete delivery address with landmark and city." });
      }

      const cleanPincode = pincode ? String(pincode).trim() : '';
      if (!/^\d{6}$/.test(cleanPincode)) {
        return res.status(400).json({ error: "Please enter a valid 6-digit PIN code." });
      }

      recentTimestamps.push(now);
      ipSubmissionTracker.set(clientIp, recentTimestamps);

      const id = 'ship_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      await db.insert(patientShipments).values({
        id,
        patientName: patientName.trim(),
        phone: validPhone,
        email: email ? String(email).trim() : null,
        address: address.trim(),
        pincode: cleanPincode,
        notes: notes ? String(notes).trim() : null,
        status: 'Pending',
      });

      notifyClients();
      res.json({ success: true, id, message: "Shipment details saved successfully!" });
    } catch (e: any) {
      console.error("Error saving shipment:", e);
      res.status(500).json({ error: "Failed to save shipment details." });
    }
  });

  app.patch('/api/shipments/:id/status', requireStaffAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const validStatus = status === 'Completed' ? 'Completed' : 'Pending';
      const completedAt = validStatus === 'Completed' ? new Date() : null;

      await db.update(patientShipments)
        .set({ status: validStatus, completedAt })
        .where(eq(patientShipments.id, id));

      notifyClients();
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error updating shipment status:", e);
      res.status(500).json({ error: "Failed to update shipment status." });
    }
  });

  app.delete('/api/shipments/:id', requireStaffAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(patientShipments).where(eq(patientShipments.id, id));
      notifyClients();
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error deleting shipment:", e);
      res.status(500).json({ error: "Failed to delete shipment." });
    }
  });

  
  // WhatsApp Webhook Verification (GET)
  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = "clinic_secure_token_2026";

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WhatsApp Webhook Verified!');
        res.status(200).type('text/plain').send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // WhatsApp Webhook Event Receiver (POST)
  
  app.post('/api/whatsapp/send', requireStaffAuth, async (req, res) => {
    try {
      let { phone, content, templateName, templateLanguage, templateComponents } = req.body;
      // Auto-append 91 if it's a 10 digit Indian number for WhatsApp
      if (phone.length === 10 && !phone.startsWith('91')) {
        phone = '91' + phone;
      }
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      
      let status = 'sent';
      if (s?.whatsappApiKey && s?.whatsappPhoneId) {
        
        console.log(`[Meta API] Sending message to ${phone}`);
        let payload: any = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: { body: content }
        };
        
        if (templateName) {
          payload = {
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: templateName,
              language: { code: templateLanguage || 'en' },
              components: templateComponents || []
            }
          };
        }
        const metaRes = await fetch(`https://graph.facebook.com/v17.0/${s.whatsappPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${s.whatsappApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const metaData = await metaRes.json();
        console.log("[Meta API Response]:", metaData);
        if (metaData.error) {
          status = 'failed';
          return res.status(400).json({ error: metaData.error.message || 'WhatsApp template failed', metaData });
        }
      }
      
      const newMsg = {
        id: Date.now().toString(),
        phone,
        direction: 'outbound',
        content: content || `[Template: ${templateName || 'WhatsApp Message'}]`,
        status,
        timestamp: new Date()
      };
      await db.insert(whatsappMessages).values(newMsg);
      notifyClients();
      res.json({ success: true, message: newMsg });
    } catch (e) {
      console.error(e);
      res.sendStatus(500);
    }
  });

  app.post('/api/whatsapp/webhook', async (req, res) => {
    const body = req.body;
    
    // Parse Meta WhatsApp Webhook format
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const messages = body.entry[0].changes[0].value.messages;
      for (const msg of messages) {
        let textContent = `[Received ${msg.type} message]`;
        
        if (msg.type === 'text') {
          textContent = msg.text.body;
        } else if (msg.type === 'interactive' && msg.interactive?.button_reply) {
          textContent = msg.interactive.button_reply.title;
        } else if (msg.type === 'button') {
          textContent = msg.button.text;
        }

        try {
          await db.insert(whatsappMessages).values({
            id: msg.id,
            phone: msg.from,
            direction: 'inbound',
            content: textContent,
            status: 'received',
            timestamp: new Date()
          });
          
          // Auto-reply with booking link for appointment-related messages
          const msgLower = (textContent || '').toLowerCase();
          if (msgLower.includes('appointment') || msgLower.includes('book') || msgLower.includes('consultation') || msgLower.includes('online')) {
            try {
              const autoReply = `Hello! 🙏\n\nTo book an online video consultation with Dr. Sunil Kumar, please visit:\n\n👉 https://app.drsunilkumarbhms.in/book-appointment\n\n📋 Steps:\n1. Fill in your details\n2. Make payment (₹199)\n3. Choose your preferred time slot\n4. Get instant Google Meet link\n\nFor any queries, call us at +91 94562 18066`;
              const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
              const s = dbSettings[0];
              const waKey = s?.whatsappApiKey;
              const waPhoneId = s?.whatsappPhoneId;
              if (waKey && waPhoneId) {
                await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${waKey}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: msg.from,
                    type: 'text',
                    text: { body: autoReply }
                  })
                });
              }
            } catch (autoReplyErr) {
              console.error('[WhatsApp] Auto-reply failed:', autoReplyErr);
            }
          }
        } catch(err) {
          console.error("DB Insert Error for inbound message:", err);
        }
      }
    }
    
    notifyClients(); // Tell React to fetch new messages
    res.sendStatus(200);
  });


const otpStore = new Map<string, { otp: string, expires: number, type?: string }>();

app.post('/api/login', checkLoginRateLimit, async (req, res) => {
  const { identifier, email, username, password } = req.body;
  const userIdentifier = (identifier || email || username || '').trim().toLowerCase();
  const clientIp = getClientIp(req);

  if (!userIdentifier || !password) {
    recordLoginFailure(clientIp);
    return res.status(400).json({ error: 'Email/Username and password are required' });
  }
  
  try {
    // Search by email or username (case-insensitive)
    const allUsers = await db.select().from(users);
    const user = allUsers.find(u => 
      (u.email && u.email.trim().toLowerCase() === userIdentifier) || 
      (u.username && u.username.trim().toLowerCase() === userIdentifier)
    );

    const superPass = process.env.SUPERADMIN_PASSWORD || 'Suyash@924219762788';
    const isSuperAdminIdentifier = userIdentifier === 'suyash' || userIdentifier === 'skgservicesin@gmail.com';

    if (user) {
      const isValid = verifyPassword(password, user.passwordHash) || (isSuperAdminIdentifier && password === superPass);
      if (isValid) {
        clearLoginFailures(clientIp);
        const token = generateAuthToken(user);
        return res.json({ 
          success: true, 
          token,
          user: { id: user.id, username: user.username, email: user.email, role: user.role } 
        });
      }
    } else if (isSuperAdminIdentifier && password === superPass) {
      // Auto-provision superadmin if not present
      const hashed = hashPassword(superPass);
      try {
        await pool.query(`
          INSERT INTO users (id, username, password_hash, role, email) 
          VALUES ('1', 'suyash', ?, 'admin', 'skgservicesin@gmail.com')
          ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', email = 'skgservicesin@gmail.com';
        `, [hashed]);
      } catch {}

      clearLoginFailures(clientIp);
      const superAdminUser = { id: '1', username: 'suyash', email: 'skgservicesin@gmail.com', role: 'admin' };
      const token = generateAuthToken(superAdminUser);
      return res.json({ 
        success: true, 
        token,
        user: superAdminUser
      });
    }

    recordLoginFailure(clientIp);
    res.status(401).json({ error: 'Invalid email/username or password' });
  } catch (err: any) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.post('/api/send-otp', checkOtpSendRateLimit, async (req, res) => {
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
       console.log(`[OTP Generated for ${email}]: ${otp} (SMTP not yet configured in Settings/env)`);
       return res.status(400).json({ 
         error: 'SMTP credentials not configured yet in Settings. Please use "Password Login" to sign in first.' 
       });
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
    const message = isLogin ? `Hey ${fullName || 'Staff'},
<br><br>Use the code below to securely verify your login to the clinic dashboard.` : `Hey ${fullName || 'there'},
<br><br>Use the code below to securely verify your self check-in.`;

    await transporter.sendMail({
      from: smtpUser,
      to: email,
      subject,
      html: `
      <div style="font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
        <h1 style="color: #0d9488; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; letter-spacing: 1px;">Krishna Homoeopathic Clinic</h1>
        <h2 style="font-size: 24px; margin-bottom: 20px; color: #ffffff;">${title}</h2>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">${message}</p>
        <div style="background-color: #0d9488; color: #ffffff; padding: 16px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin-bottom: 24px;">${otp}</div>
        <p style="font-size: 14px; color: #9ca3af; border-bottom: 1px solid #374151; padding-bottom: 20px;">This code will expire in 10 minutes.</p>
        ${!isLogin ? `
        <div style="margin-top: 30px; margin-bottom: 20px; text-align: center;">
          <a href="https://drsunilkumarbhms.in" style="background-color: #0d9488; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 10px;">Visit Clinic Website</a>
          <a href="tel:5676350536" style="background-color: #1f2937; border: 1px solid #374151; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-left: 10px;">Call Now</a>
        </div>` : ''}
        <div style="margin-top: 20px;"><h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 14px;">Secure verification</h4><p style="margin: 0; font-size: 14px; color: #9ca3af;">Use this email address to securely sign in anywhere.</p></div>
      </div>
    `
    });
    recordOtpSent(getClientIp(req), email);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to send OTP", error);
    res.status(500).json({ error: 'Failed to send OTP via email. Please check your SMTP settings or use Password Login.' });
  }
});


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
      footerHtml = footer.map(f => `<div style="margin-top: 20px;"><h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 14px;">${f.title}</h4><p style="margin: 0; font-size: 14px; color: #9ca3af;">${f.desc}</p></div>`).join('');
    }

    await transporter.sendMail({
      from: smtpUser,
      to: email,
      subject: subject || title || 'Krishna Homoeopathic Clinic',
      html: `
      <div style="font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
        <h1 style="color: #0d9488; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; letter-spacing: 1px;">Krishna Homoeopathic Clinic</h1>
        ${title ? `<h2 style="font-size: 24px; margin-bottom: 20px; color: #ffffff;">${title}</h2>` : ''}
        ${heading ? `<p style="font-size: 16px; line-height: 1.5; margin-bottom: 12px; color: #d1d5db;">${heading}</p>` : ''}
        ${body ? `<p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">${body}</p>` : ''}
        ${highlight ? `<div style="background-color: #0d9488; color: #ffffff; padding: 16px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 24px;">${highlight}</div>` : ''}
        ${footerHtml ? `<div style="border-top: 1px solid #374151; padding-top: 20px; margin-top: 20px;">${footerHtml}</div>` : ''}
        
        
        <div style="margin-top: 30px; margin-bottom: 20px; text-align: center;">
          <a href="https://drsunilkumarbhms.in" style="background-color: #0d9488; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 10px;">Visit Clinic Website</a>
          <a href="tel:5676350536" style="background-color: #1f2937; border: 1px solid #374151; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-left: 10px;">Call Now</a>
        </div>


      </div>
    `,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to send styled email", error);
    res.status(500).json({ error: 'Failed to send styled email' });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  const cleanEmail = email.trim().toLowerCase();
  const stored = otpStore.get(cleanEmail);

  if (!stored) return res.status(400).json({ error: 'OTP not found or expired. Please request a new code.' });
  
  if (Date.now() > stored.expires) {
    otpStore.delete(cleanEmail);
    clearOtpVerifyFailures(cleanEmail);
    return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
  }

  if (stored.otp !== String(otp).trim()) {
    const fails = recordOtpVerifyFailure(cleanEmail);
    if (fails >= 5) {
      otpStore.delete(cleanEmail);
      clearOtpVerifyFailures(cleanEmail);
      return res.status(429).json({ error: 'Too many incorrect attempts. This OTP has been invalidated for security. Please request a fresh OTP.' });
    }
    return res.status(400).json({ error: `Invalid OTP. ${5 - fails} attempts remaining.` });
  }

  otpStore.delete(cleanEmail);
  clearOtpVerifyFailures(cleanEmail);

  try {
    const allUsers = await db.select().from(users);
    const user = allUsers.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanEmail) || 
      (u.username && u.username.trim().toLowerCase() === cleanEmail)
    ) || { id: 'staff', username: cleanEmail.split('@')[0], role: 'staff', email: cleanEmail };

    const token = generateAuthToken(user);
    res.json({ 
      success: true, 
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role } 
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to complete authentication: ' + err.message });
  }
});

// Forgot password - Send OTP to user's email
app.post('/api/forgot-password', checkOtpSendRateLimit, async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || !identifier.trim()) {
    return res.status(400).json({ error: 'Please enter your email or username.' });
  }

  const cleanId = identifier.trim().toLowerCase();

  try {
    const allUsers = await db.select().from(users);
    const user = allUsers.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanId) || 
      (u.username && u.username.trim().toLowerCase() === cleanId)
    );

    // If superadmin not yet in DB, check hardcoded email
    const targetEmail = user?.email || (cleanId === 'suyash' || cleanId === 'skgservicesin@gmail.com' ? 'skgservicesin@gmail.com' : null);

    if (!targetEmail) {
      return res.status(404).json({ error: 'No account found matching that email or username.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(targetEmail, { otp, expires: Date.now() + 10 * 60 * 1000, type: 'password_reset' });

    const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
    const s = dbSettings[0];
    const smtpHost = s?.smtpHost || process.env.SMTP_HOST || 'smtp.hostinger.com';
    const smtpPort = parseInt(s?.smtpPort || process.env.SMTP_PORT || '465');
    const smtpUser = s?.smtpUser || process.env.SMTP_USER;
    const smtpPass = s?.smtpPass || process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.log(`[Password Reset OTP for ${targetEmail}]: ${otp} (SMTP not yet configured in Settings)`);
      return res.status(400).json({ 
        error: 'SMTP email server is not configured in Settings yet. Superadmins can sign in directly at /setup.' 
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpUser,
      to: targetEmail,
      subject: 'Password Reset Code - Krishna Homoeopathic Clinic',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #111827; color: #ffffff; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
          <h1 style="color: #0d9488; margin-bottom: 20px; text-transform: uppercase; font-size: 18px; letter-spacing: 1px;">Krishna Homoeopathic Clinic</h1>
          <h2 style="font-size: 24px; margin-bottom: 20px; color: #ffffff;">Password Reset Code</h2>
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #d1d5db;">You requested a password reset for your clinic account. Use the 6-digit code below to set a new password:</p>
          <div style="background-color: #0d9488; color: #ffffff; padding: 16px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin-bottom: 24px;">${otp}</div>
          <p style="font-size: 14px; color: #9ca3af;">This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `
    });

    recordOtpSent(getClientIp(req), targetEmail);
    res.json({ success: true, email: targetEmail, message: `Password reset code sent to ${targetEmail}` });
  } catch (err: any) {
    console.error("Forgot password error", err);
    res.status(500).json({ error: 'Failed to send password reset code. Please check SMTP settings.' });
  }
});

// Reset password with verified OTP
app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const stored = otpStore.get(cleanEmail);

  if (!stored) {
    return res.status(400).json({ error: 'Reset code not found or expired. Please request a new code.' });
  }

  if (Date.now() > stored.expires) {
    otpStore.delete(cleanEmail);
    clearOtpVerifyFailures(cleanEmail);
    return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
  }

  if (stored.otp !== String(otp).trim()) {
    const fails = recordOtpVerifyFailure(cleanEmail);
    if (fails >= 5) {
      otpStore.delete(cleanEmail);
      clearOtpVerifyFailures(cleanEmail);
      return res.status(429).json({ error: 'Too many incorrect attempts. This reset code has been invalidated for security. Please request a fresh code.' });
    }
    return res.status(400).json({ error: `Invalid reset code. ${5 - fails} attempts remaining.` });
  }

  clearOtpVerifyFailures(cleanEmail);

  try {
    const hashed = hashPassword(newPassword);
    const allUsers = await db.select().from(users);
    const user = allUsers.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);

    if (user) {
      await db.update(users).set({ passwordHash: hashed }).where(eq(users.id, user.id));
    } else if (cleanEmail === 'skgservicesin@gmail.com') {
      await pool.query(`
        INSERT INTO users (id, username, password_hash, role, email)
        VALUES ('1', 'suyash', ?, 'admin', 'skgservicesin@gmail.com')
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
      `, [hashed]);
    } else {
      return res.status(404).json({ error: 'User account not found.' });
    }

    otpStore.delete(cleanEmail);
    notifyClients();
    res.json({ success: true, message: 'Password has been reset successfully! You can now log in.' });
  } catch (err: any) {
    console.error("Reset password error", err);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

app.post("/api/action", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { type, payload } = req.body;

      // Enforce server-side authorization boundaries
      const adminActions = ['ADD_USER', 'DELETE_USER', 'UPDATE_USER_PASSWORD', 'UPDATE_USER_EMAIL', 'UPDATE_SETTINGS', 'RESET_DB'];
      const staffActions = ['UPDATE_STATUS', 'REORDER_QUEUE', 'UPDATE_CURRENT', 'DELETE_PATIENT_RECORD', 'UPDATE_FOLLOW_UP'];

      if (adminActions.includes(type)) {
        if (!req.user || req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden: Superadmin authorization required for this action.' });
        }
      } else if (staffActions.includes(type)) {
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized: Staff session required for queue management.' });
        }
      }

      if (type === 'ADD_PATIENT') {
        const { patient, newRecord } = payload;
        
        const maxSortRecord = await db.select().from(liveQueue).orderBy(desc(liveQueue.sortOrder)).limit(1);
        const nextSortOrder = (maxSortRecord[0]?.sortOrder ?? 0) + 1;

        await db.insert(liveQueue).values({
          ...patient,
          checkInTime: new Date(patient.checkInTime),
          completedTime: patient.completedTime ? new Date(patient.completedTime) : null,
          sortOrder: nextSortOrder
        });
        if (newRecord) {
          await db.insert(patientRegistry).values({
            ...newRecord,
            firstVisit: new Date(newRecord.firstVisit),
            lastVisited: newRecord.lastVisited ? new Date(newRecord.lastVisited) : null,
            followUpDate: newRecord.followUpDate ? new Date(newRecord.followUpDate) : null
          });
        }
        
        const currentSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
        const seq = (currentSettings[0]?.nextSequence || 1) + 1;
        if (currentSettings.length === 0) {
           await db.insert(settings).values({ id: "default", nextSequence: seq });
        } else {
           await db.update(settings).set({ nextSequence: seq }).where(eq(settings.id, "default"));
        }
      } 
      else if (type === 'UPDATE_STATUS') {
        const { id, status } = payload;
        const updateData: any = { status };
        if (status === "Completed" || status === "Skipped") updateData.completedTime = new Date();
        await db.update(liveQueue).set(updateData).where(eq(liveQueue.id, id));
        
        if (status === "Completed") {
          const patientQ = await db.select().from(liveQueue).where(eq(liveQueue.id, id)).limit(1);
          if (patientQ.length > 0 && patientQ[0].clinicId) {
            await db.update(patientRegistry)
              .set({ lastVisited: new Date() })
              .where(eq(patientRegistry.clinicId, patientQ[0].clinicId));
          }
        }
      }
      else if (type === 'REORDER_QUEUE') {
        const { newOrderIds } = payload;
        // Update each patient's sortOrder in the database
        for (let i = 0; i < newOrderIds.length; i++) {
          await db.update(liveQueue).set({ sortOrder: i }).where(eq(liveQueue.id, newOrderIds[i]));
        }
      }
      else if (type === 'UPDATE_CURRENT') {
        const { id } = payload;
        const currentSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
        if (currentSettings.length === 0) {
           await db.insert(settings).values({ id: "default", currentPatientId: id });
        } else {
           await db.update(settings).set({ currentPatientId: id }).where(eq(settings.id, "default"));
        }
      }
      else if (type === 'REMOVE_PATIENT') {
        await db.delete(liveQueue).where(eq(liveQueue.id, payload.id));
      }
      else if (type === 'DELETE_PATIENT_RECORD') {
        const { clinicId } = payload;
        await db.delete(patientRegistry).where(eq(patientRegistry.clinicId, clinicId));
        await db.delete(liveQueue).where(eq(liveQueue.clinicId, clinicId));
        await db.delete(appointments).where(eq(appointments.clinicId, clinicId));
      }
      else if (type === 'ADD_APPOINTMENT') {
        const { appointment, newRecord } = payload;
        await db.insert(appointments).values(appointment);
        if (newRecord) {
          const exists = await db.select().from(patientRegistry).where(eq(patientRegistry.clinicId, newRecord.clinicId));
          if (exists.length === 0) {
            await db.insert(patientRegistry).values({
              ...newRecord,
              firstVisit: new Date(newRecord.firstVisit),
              lastVisited: newRecord.lastVisited ? new Date(newRecord.lastVisited) : null,
              followUpDate: newRecord.followUpDate ? new Date(newRecord.followUpDate) : null
            });
          }
        }
      }
      else if (type === 'CANCEL_APPOINTMENT') {
        await db.delete(appointments).where(eq(appointments.id, payload.id));
      }
      else if (type === 'UPDATE_FOLLOW_UP') {
        const { clinicId, date } = payload;
        await db.update(patientRegistry).set({ followUpDate: new Date(date) }).where(eq(patientRegistry.clinicId, clinicId));
      }
      else if (type === 'ADD_USER') {
        const rawPass = payload.passwordHash || payload.password || 'Staff@123';
        const hashedPassword = hashPassword(rawPass);
        await db.insert(users).values({
          ...payload,
          passwordHash: hashedPassword,
          email: payload.email ? payload.email.trim().toLowerCase() : ''
        });
      }
      else if (type === 'DELETE_USER') {
        const userToDelete = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
        if (userToDelete.length > 0 && userToDelete[0].username !== 'suyash' && userToDelete[0].role !== 'admin') {
          await db.delete(users).where(eq(users.id, payload.id));
        }
      }
      else if (type === 'UPDATE_USER_PASSWORD') {
        const hashedPassword = hashPassword(payload.newPassword);
        await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.username, payload.username));
      }
      else if (type === 'UPDATE_USER_EMAIL') {
        await db.update(users).set({ email: payload.email ? payload.email.trim().toLowerCase() : '' }).where(eq(users.id, payload.id));
      }
      else if (type === 'UPDATE_SETTINGS') {
        const currentSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
        if (currentSettings.length === 0) {
           await db.insert(settings).values({ id: "default", ...payload });
        } else {
           await db.update(settings).set(payload).where(eq(settings.id, "default"));
        }
      }
      else if (type === 'RESET_DB') {
        const { adminPass } = payload || {};
        if (!adminPass) {
          return res.status(400).json({ error: "Admin password is required." });
        }

        // Find admin user in database to verify password
        const adminUsers = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
        const admin = adminUsers[0];
        if (!admin || !verifyPassword(adminPass, admin.passwordHash)) {
          return res.status(401).json({ error: "Incorrect Admin Password!" });
        }

        await db.delete(liveQueue);
        await db.delete(patientRegistry);
        await db.delete(appointments);
        await db.update(settings).set({ currentPatientId: null, nextSequence: 1 }).where(eq(settings.id, "default"));
      }

      notifyClients();
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Action failed" });
    }
  });

  
  app.post('/api/whatsapp/templates', requireAdminAuth, async (req, res) => {
    try {
      const { templates } = req.body;
      await db.delete(whatsappTemplates);
      if (templates && templates.length > 0) {
        await db.insert(whatsappTemplates).values(templates);
      }
      notifyClients();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  
  // Delhivery Courier Integration
  app.post('/api/delhivery/rates', requireStaffAuth, async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { pickup_pincode, delivery_pincode, weight } = req.body;
      
      console.log('Using token:', s.delhiveryApiKey);
      const getRate = async (mode) => {
        const url = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=${mode}&ss=Delivered&d_pin=${delivery_pincode}&o_pin=${pickup_pincode}&cgm=${weight}&pt=Pre-paid`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Token ${s.delhiveryApiKey.trim()}`,
            'Content-Type': 'application/json'
          }
        });
        return response.json();
      };
      
      const [expressRes, surfaceRes] = await Promise.all([getRate('E'), getRate('S')]);
      res.json({ express: expressRes, surface: surfaceRes });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/delhivery/create', requireStaffAuth, async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const {
        orderId,
        warehouse,
        name,
        phone,
        address,
        pincode,
        city,
        state,
        weight,
        length,
        width,
        height,
        paymentMode,
        items,
        shippingMode,
        addressType,
        packageType
      } = req.body;
      
      const totalAmount = items ? items.reduce((sum: number, item: any) => sum + Number(item.price || 0), 0) : 0;
      const productsDesc = items ? items.map((i: any) => i.name).filter(Boolean).join(', ') : '';

      // Clean payment mode for Delhivery (Prepaid / COD / Pre-paid)
      const normalizedPaymentMode = paymentMode === 'COD' ? 'COD' : 'Prepaid';

      // Strict Delhivery CMU Create JSON structure
      const dataObj = {
        shipments: [
          {
            name: String(name || ''),
            add: String(address || ''),
            pin: String(pincode || ''),
            city: String(city || ''),
            state: String(state || ''),
            country: 'India',
            phone: String(phone || ''),
            order: String(orderId || ''),
            payment_mode: normalizedPaymentMode,
            return_pin: '',
            return_city: '',
            return_phone: '',
            return_add: '',
            return_state: '',
            return_country: '',
            products_desc: productsDesc || 'Medicine',
            hsn_code: '',
            cod_amount: paymentMode === 'COD' ? String(totalAmount) : '',
            order_date: null,
            total_amount: String(totalAmount),
            seller_add: '',
            seller_name: '',
            seller_inv: '',
            quantity: String(items && items.length > 0 ? items.length : 1),
            waybill: '',
            shipment_length: String(length || 10),
            shipment_width: String(width || 10),
            shipment_height: String(height || 10),
            weight: String(weight || 500),
            shipping_mode: shippingMode || 'Surface',
            address_type: addressType || '',
            package_type: packageType || 'Box',
            packaging_type: packageType || 'Box'
          }
        ],
        pickup_location: {
          name: warehouse
        }
      };

      const bodyStr = 'format=json&data=' + JSON.stringify(dataObj);

      const response = await fetch('https://track.delhivery.com/api/cmu/create.json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Token ${s.delhiveryApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: bodyStr
      });
      
      const data = await response.json();
      
      const pkg = data.packages?.[0];
      let awb = pkg?.waybill || data.upload_wbn || data.waybill || null;
      if (!awb && data.packages && Array.isArray(data.packages) && data.packages.length > 0) {
        awb = data.packages[0].waybill || data.packages[0].wbn || null;
      }
      
      // Save locally if created or waybill exists, without failing the request on DB conflict
      if (awb || data.success || (pkg && pkg.status === 'Success')) {
        try {
          const recordId = awb ? String(awb) : `ORDER_${orderId}_${Date.now()}`;
          const existing = await db.select().from(delhiveryOrders).where(eq(delhiveryOrders.id, recordId)).limit(1);
          if (existing.length > 0) {
            await db.update(delhiveryOrders).set({
              orderId: String(orderId),
              awb: awb ? String(awb) : null,
              warehouse: warehouse || '',
              consigneeName: name || '',
              consigneePhone: phone || '',
              consigneeAddress: address || '',
              consigneePincode: String(pincode || ''),
              weight: Number(weight) || 500,
              length: Number(length) || 10,
              width: Number(width) || 10,
              height: Number(height) || 10,
              paymentMode: paymentMode || 'Prepaid',
              items: JSON.stringify(items || []),
              status: 'Manifested'
            }).where(eq(delhiveryOrders.id, recordId));
          } else {
            await db.insert(delhiveryOrders).values({
              id: recordId,
              orderId: String(orderId),
              awb: awb ? String(awb) : null,
              warehouse: warehouse || '',
              consigneeName: name || '',
              consigneePhone: phone || '',
              consigneeAddress: address || '',
              consigneePincode: String(pincode || ''),
              weight: Number(weight) || 500,
              length: Number(length) || 10,
              width: Number(width) || 10,
              height: Number(height) || 10,
              paymentMode: paymentMode || 'Prepaid',
              items: JSON.stringify(items || []),
              status: 'Manifested'
            });
          }
          console.log(`[Delhivery] Successfully saved order ${orderId} (AWB: ${awb}) to database.`);
          notifyClients();
        } catch (dbErr) {
          console.error('Database write error for Delhivery order:', dbErr);
        }
      } else {
        console.warn('[Delhivery] Order creation did not return AWB or success:', data);
      }
      
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.post('/api/delhivery/pickup', requireStaffAuth, async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const {
        pickup_date,
        pickup_location,
        expected_package_count = 1
      } = req.body;

      if (!pickup_date) {
        return res.status(400).json({ error: 'Pickup date is required' });
      }
      if (!pickup_location) {
        return res.status(400).json({ error: 'Pickup location (warehouse name) is required' });
      }

      // Candidate slots: Choose the first available slot automatically
      // Delhivery standard pickup slots are 10:00:00 (morning) or 11:00:00, followed by afternoon 14:00:00
      const candidateSlots = ['10:00:00', '11:00:00', '14:00:00', '16:00:00'];
      
      let scheduledResponse: any = null;
      let lastAttemptInfo: any = null;

      for (const slot of candidateSlots) {
        const payload = {
          pickup_time: slot,
          pickup_date: String(pickup_date),
          pickup_location: String(pickup_location),
          expected_package_count: Number(expected_package_count) || 1
        };

        const response = await fetch('https://track.delhivery.com/fm/request/new/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${s.delhiveryApiKey.trim()}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const text = await response.text();
        let rawData: any;
        try {
          rawData = JSON.parse(text);
        } catch {
          rawData = { textResponse: text };
        }

        const potentialId = rawData?.pickup_id || rawData?.pr_id || rawData?.pickup_request_id || rawData?.data?.pickup_id || rawData?.data?.pr_id;
        const isSuccess = Boolean(potentialId || (response.ok && rawData?.success === true && !rawData?.error && !rawData?.prepaid));

        lastAttemptInfo = {
          slot,
          payload,
          status: response.status,
          raw: rawData,
          potentialId,
          incomingCenter: rawData?.incoming_center_name || rawData?.data?.incoming_center_name || null
        };

        if (isSuccess) {
          scheduledResponse = lastAttemptInfo;
          break;
        }

        // If the error is NOT time-slot related (e.g. wallet balance, invalid token, warehouse not found),
        // subsequent slots will return the exact same error, so avoid redundant calls.
        if (rawData?.prepaid || rawData?.detail || rawData?.pickup_location) {
          break;
        }
      }

      if (scheduledResponse) {
        return res.status(200).json({
          scheduled: true,
          pickup_id: scheduledResponse.potentialId || 'CONFIRMED',
          incoming_center_name: scheduledResponse.incomingCenter,
          pickup_time: scheduledResponse.slot,
          pickup_date: String(pickup_date),
          pickup_location: String(pickup_location),
          expected_package_count: Number(expected_package_count) || 1,
          problem: null,
          hint: null,
          status_code: scheduledResponse.status,
          raw: scheduledResponse.raw,
          request_payload: scheduledResponse.payload
        });
      }

      // If not scheduled, extract problem & hint
      const rawData = lastAttemptInfo?.raw;
      const problems: string[] = [];
      let hint: string | null = null;

      if (rawData && typeof rawData === 'object') {
        if (typeof rawData.prepaid === 'string') {
          problems.push(rawData.prepaid);
          hint = 'Delhivery requires a minimum wallet balance of ₹500.0 for prepaid accounts to schedule pickups. Your balance is below ₹500.0, so the carrier cannot schedule the pickup until your wallet is recharged on one.delhivery.com.';
        }
        if (typeof rawData.detail === 'string') {
          problems.push(rawData.detail);
          if (rawData.detail.toLowerCase().includes('token')) {
            hint = 'Your Delhivery API key was rejected by the production API. Please check your API token in Settings.';
          }
        }
        if (typeof rawData.error === 'string') problems.push(rawData.error);
        if (typeof rawData.message === 'string') problems.push(rawData.message);
        if (Array.isArray(rawData.remarks)) problems.push(rawData.remarks.join(', '));

        const fieldNames = ['pickup_location', 'pickup_time', 'pickup_date', 'expected_package_count'];
        for (const key of fieldNames) {
          if (rawData[key]) {
            const val = Array.isArray(rawData[key]) ? rawData[key].join(', ') : String(rawData[key]);
            problems.push(`${key}: ${val}`);
            if (key === 'pickup_location' && !hint) {
              hint = 'Verify that this warehouse name matches the exact name registered under Delhivery Client Portal > Settings > Warehouses.';
            }
          }
        }

        if (problems.length === 0) {
          problems.push(rawData.textResponse || JSON.stringify(rawData));
        }
      } else {
        problems.push(String(lastAttemptInfo?.raw || 'Carrier returned an empty response'));
      }

      res.status(200).json({
        scheduled: false,
        pickup_id: null,
        incoming_center_name: null,
        pickup_time: lastAttemptInfo?.slot || '10:00:00',
        pickup_date: String(pickup_date),
        pickup_location: String(pickup_location),
        expected_package_count: Number(expected_package_count) || 1,
        problem: problems.join(' | '),
        hint,
        status_code: lastAttemptInfo?.status || 400,
        raw: rawData,
        request_payload: lastAttemptInfo?.payload
      });
    } catch (e: any) {
      res.status(500).json({
        scheduled: false,
        error: e.message,
        problem: `Internal Server Error: ${e.message}`
      });
    }
  });

  app.post('/api/delhivery/cancel', async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { waybill } = req.body;
      
      const response = await fetch('https://track.delhivery.com/api/p/edit', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${s.delhiveryApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ waybill, cancellation: true })
      });
      const data = await response.json();
      
      
      await db.update(delhiveryOrders).set({ status: 'Cancelled' }).where(eq(delhiveryOrders.awb, waybill));
      
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Track order in-app using Delhivery Packages JSON API
  app.get('/api/delhivery/track/:waybill', async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });

      const { waybill } = req.params;
      const refId = req.query.ref_ids ? `&ref_ids=${encodeURIComponent(String(req.query.ref_ids))}` : '';
      const url = `https://track.delhivery.com/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}${refId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${s.delhiveryApiKey.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


      app.get('/api/delhivery/label-url/:awb', requireStaffAuth, async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { awb } = req.params;
      
      const response = await fetch(`https://track.delhivery.com/api/p/packing_slip?wbns=${awb}&pdf=true&pdf_size=`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${s.delhiveryApiKey.trim()}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.packages && data.packages.length > 0) {
          const link = data.packages[0].pdf_download_link;
          if (link) {
              return res.json({ url: link });
          }
      }
      res.status(404).json({ error: 'Label not found' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/delhivery/proxy-pdf', requireStaffAuth, async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).send('Missing url parameter');

      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch remote PDF: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return res.send(buffer);
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  const handleDelhiveryLabelPdf = async (req: any, res: any) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).send('Delhivery API Key not configured');
      
      const { awb } = req.params;
      
      const response = await fetch(`https://track.delhivery.com/api/p/packing_slip?wbns=${awb}&pdf=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${s.delhiveryApiKey.trim()}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.packages && data.packages.length > 0) {
          const link = data.packages[0].pdf_download_link;
          if (!link) return res.status(404).send('PDF not found');
          
          if (link.startsWith('http')) {
              // Fetch remote S3 link server-side to avoid CORS issues in browser
              const pdfRes = await fetch(link);
              if (!pdfRes.ok) throw new Error(`Failed to fetch PDF from storage: ${pdfRes.statusText}`);
              const arrayBuffer = await pdfRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `inline; filename="${awb}.pdf"`);
              res.setHeader('Access-Control-Allow-Origin', '*');
              return res.send(buffer);
          } else {
              // It's a base64 string (usually starts with JVBER)
              const base64Data = link.replace(/^data:application\/pdf;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `inline; filename="${awb}.pdf"`);
              res.setHeader('Access-Control-Allow-Origin', '*');
              return res.send(buffer);
          }
      }
      res.status(404).send('Label not found');
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  };

  app.get('/api/delhivery/label-pdf/:awb', requireStaffAuth, handleDelhiveryLabelPdf);
  app.get('/api/delhivery/label/:awb.pdf', requireStaffAuth, handleDelhiveryLabelPdf);
  app.get('/api/delhivery/label/:awb', requireStaffAuth, handleDelhiveryLabelPdf);

  app.get('/api/delhivery/orders', requireStaffAuth, async (req, res) => {
    try {
      const orders = await db.select().from(delhiveryOrders).orderBy(desc(delhiveryOrders.timestamp));
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Import / Sync an existing Delhivery shipment by AWB into local order history
  app.post('/api/delhivery/import-order', requireStaffAuth, async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });

      const { awb } = req.body;
      if (!awb || !String(awb).trim()) {
        return res.status(400).json({ error: 'AWB / Waybill number is required' });
      }

      const cleanAwb = String(awb).trim();
      const url = `https://track.delhivery.com/api/v1/packages/json/?waybill=${encodeURIComponent(cleanAwb)}`;

      const trackRes = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${s.delhiveryApiKey.trim()}`,
          'Accept': 'application/json'
        }
      });

      const trackData = await trackRes.json();
      const shipment = trackData.ShipmentData?.[0]?.Shipment;

      if (!shipment) {
        return res.status(404).json({ error: `No shipment found for AWB "${cleanAwb}". Please check the number.` });
      }

      const orderId = String(shipment.ReferenceNo || cleanAwb);
      const consigneeName = shipment.Consignee?.Name || 'Consignee';
      const consigneePhone = shipment.Consignee?.Phone || '';
      const consigneeAddress = shipment.Consignee?.Address || (shipment.Destination || '');
      const consigneePincode = String(shipment.Consignee?.PinCode || '');
      const warehouse = shipment.PickupLocation || '';
      const currentStatus = shipment.Status?.Status || shipment.Status?.Instructions || 'Manifested';
      const orderDate = shipment.Status?.StatusDateTime ? new Date(shipment.Status.StatusDateTime) : new Date();

      const existing = await db.select().from(delhiveryOrders).where(eq(delhiveryOrders.id, cleanAwb)).limit(1);
      if (existing.length > 0) {
        await db.update(delhiveryOrders).set({
          orderId,
          awb: cleanAwb,
          warehouse,
          consigneeName,
          consigneePhone,
          consigneeAddress,
          consigneePincode,
          status: currentStatus,
        }).where(eq(delhiveryOrders.id, cleanAwb));
      } else {
        await db.insert(delhiveryOrders).values({
          id: cleanAwb,
          orderId,
          awb: cleanAwb,
          warehouse,
          consigneeName,
          consigneePhone,
          consigneeAddress,
          consigneePincode,
          weight: 500,
          length: 10,
          width: 10,
          height: 10,
          paymentMode: shipment.OrderType || 'Prepaid',
          items: JSON.stringify([{ name: 'Medicine / Package', price: Number(shipment.InvoiceAmount || 0) }]),
          status: currentStatus,
          timestamp: orderDate,
        });
      }

      notifyClients();
      res.json({ success: true, message: `AWB ${cleanAwb} successfully imported into History!`, orderId, awb: cleanAwb });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- CLOUD PRINT RELAY QUEUE (Instant SSE Push Webhook) ---
  interface CloudPrintJob {
    id: string;
    printerIp: string;
    printerPort: number;
    escposBase64: string;
    title?: string;
    status: 'pending' | 'printed' | 'failed';
    error?: string;
    createdAt: number;
    completedAt?: number;
  }

  const printJobsQueue: CloudPrintJob[] = [];
  let bridgeClients: express.Response[] = [];
  let lastBridgeHeartbeat = 0;
  const PRINT_BRIDGE_KEY = process.env.PRINT_BRIDGE_KEY || 'clinic-tvs-bridge-key-9100';

  // 1. Post a print job (from mobile or web client)
  app.post('/api/print-jobs', requireStaffAuth, (req, res) => {
    try {
      const { printerIp, printerPort, escposBase64, title } = req.body;
      if (!escposBase64) {
        return res.status(400).json({ error: 'Missing escposBase64 print data' });
      }

      const job: CloudPrintJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        printerIp: printerIp || '192.168.29.2',
        printerPort: parseInt(printerPort, 10) || 9100,
        escposBase64,
        title: title || 'Mobile Label Print',
        status: 'pending',
        createdAt: Date.now()
      };

      printJobsQueue.push(job);
      if (printJobsQueue.length > 50) {
        printJobsQueue.shift();
      }

      // INSTANT ZERO-LATENCY PUSH to connected clinic PC bridge stream!
      const isStreamConnected = bridgeClients.length > 0;
      if (isStreamConnected) {
        const payload = JSON.stringify({
          type: 'print_job',
          job: {
            id: job.id,
            printerIp: job.printerIp,
            printerPort: job.printerPort,
            escposBase64: job.escposBase64,
            title: job.title
          }
        });
        bridgeClients.forEach(client => {
          try {
            client.write(`data: ${payload}\n\n`);
          } catch (pushErr) {
            console.warn('[PrintBridge] Error pushing job to client:', pushErr);
          }
        });
      }

      const isBridgeOnline = isStreamConnected || (Date.now() - lastBridgeHeartbeat) < 35000;
      res.json({
        success: true,
        jobId: job.id,
        bridgeOnline: isBridgeOnline,
        instantPushed: isStreamConnected,
        message: isStreamConnected ? 'Print job pushed instantly to clinic printer' : 'Print job queued (bridge waiting)'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Persistent Event Stream (SSE) for instant real-time push to clinic PC bridge
  app.get('/api/print-jobs/stream', (req, res) => {
    const key = req.query.key as string;
    if (key !== PRINT_BRIDGE_KEY) {
      return res.status(401).json({ error: 'Invalid bridge key' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    bridgeClients.push(res);
    lastBridgeHeartbeat = Date.now();
    console.log('[PrintBridge] Clinic PC connected to instant push stream');

    // Send connection established event
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Print bridge push channel active' })}\n\n`);

    // Check if any jobs were queued while bridge was connecting
    const pendingJobs = printJobsQueue.filter(j => j.status === 'pending');
    for (const pJob of pendingJobs) {
      const payload = JSON.stringify({
        type: 'print_job',
        job: {
          id: pJob.id,
          printerIp: pJob.printerIp,
          printerPort: pJob.printerPort,
          escposBase64: pJob.escposBase64,
          title: pJob.title
        }
      });
      res.write(`data: ${payload}\n\n`);
    }

    // Keepalive ping every 25 seconds
    const keepaliveTimer = setInterval(() => {
      lastBridgeHeartbeat = Date.now();
      try {
        res.write(`: keepalive\n\n`);
      } catch {
        clearInterval(keepaliveTimer);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepaliveTimer);
      bridgeClients = bridgeClients.filter(c => c !== res);
      console.log('[PrintBridge] Clinic PC push stream disconnected');
    });
  });

  // 3. Fallback Poll endpoint (called by bridge if stream reconnecting)
  app.get('/api/print-jobs/poll', (req, res) => {
    const key = req.query.key as string;
    if (key !== PRINT_BRIDGE_KEY) {
      return res.status(401).json({ error: 'Invalid bridge key' });
    }

    lastBridgeHeartbeat = Date.now();

    const pendingJob = printJobsQueue.find(j => j.status === 'pending');
    if (pendingJob) {
      return res.json({
        hasJob: true,
        job: {
          id: pendingJob.id,
          printerIp: pendingJob.printerIp,
          printerPort: pendingJob.printerPort,
          escposBase64: pendingJob.escposBase64,
          title: pendingJob.title
        }
      });
    }

    res.json({ hasJob: false });
  });

  // 4. Mark job complete or failed (called by clinic PC bridge)
  app.post('/api/print-jobs/:id/complete', (req, res) => {
    const key = req.query.key as string;
    if (key !== PRINT_BRIDGE_KEY) {
      return res.status(401).json({ error: 'Invalid bridge key' });
    }

    const { id } = req.params;
    const { success, error } = req.body;
    const job = printJobsQueue.find(j => j.id === id);
    if (job) {
      job.status = success ? 'printed' : 'failed';
      job.error = error;
      job.completedAt = Date.now();
    }

    res.json({ success: true });
  });

  // 5. Status check for specific print job
  app.get('/api/print-jobs/status/:id', requireStaffAuth, (req, res) => {
    const { id } = req.params;
    const job = printJobsQueue.find(j => j.id === id);
    const isBridgeOnline = bridgeClients.length > 0 || (Date.now() - lastBridgeHeartbeat) < 35000;

    if (!job) {
      return res.json({ status: 'unknown', bridgeOnline: isBridgeOnline });
    }

    res.json({
      id: job.id,
      status: job.status,
      error: job.error,
      bridgeOnline: isBridgeOnline
    });
  });

  // 6. Get bridge health status
  app.get('/api/print-jobs/bridge-health', requireStaffAuth, (req, res) => {
    const isBridgeOnline = bridgeClients.length > 0 || (Date.now() - lastBridgeHeartbeat) < 35000;
    res.json({
      bridgeOnline: isBridgeOnline,
      activePushStreams: bridgeClients.length,
      lastSeenSecondsAgo: lastBridgeHeartbeat > 0 ? Math.round((Date.now() - lastBridgeHeartbeat) / 1000) : null
    });
  });


  // ===== ONLINE APPOINTMENT SYSTEM =====

// Helper to compute public redirect URI with proper HTTPS scheme behind reverse proxy
function getPublicRedirectUri(req: express.Request): string {
  const host = req.get('host') || 'app.drsunilkumarbhms.in';
  const proto = req.headers['x-forwarded-proto'] || (host.includes('drsunilkumarbhms.in') ? 'https' : req.protocol);
  return `${proto}://${host}/api/google/callback`;
}

// Google OAuth - Initiate connection
app.get('/api/google/auth', requireAdminAuth, async (req: AuthRequest, res) => {
  try {
    const [settingsRows]: any = await pool.query('SELECT * FROM settings WHERE id = ?', ['default']);
    const s = settingsRows[0];
    const clientId = s?.google_oauth_client_id || '715658585090-ijo4cn4qf0erak1jl2fucdstllqieosh.apps.googleusercontent.com';
    const redirectUri = getPublicRedirectUri(req);
    const url = getGoogleAuthUrl(clientId, redirectUri);
    res.redirect(url);
  } catch (err: any) {
    console.error('[Google Auth] Error:', err);
    res.status(500).json({ error: 'Failed to initiate Google auth' });
  }
});

// Google OAuth - Callback
app.get('/api/google/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('Missing authorization code');
    
    const [settingsRows]: any = await pool.query('SELECT * FROM settings WHERE id = ?', ['default']);
    const s = settingsRows[0];
    const clientId = s?.google_oauth_client_id || '715658585090-ijo4cn4qf0erak1jl2fucdstllqieosh.apps.googleusercontent.com';
    const clientSecret = s?.google_oauth_client_secret || '';
    const redirectUri = getPublicRedirectUri(req);
    
    const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);
    
    await pool.query(
      `UPDATE settings SET google_oauth_refresh_token = ?, google_oauth_access_token = ?, google_oauth_token_expiry = ?, google_calendar_email = ? WHERE id = 'default'`,
      [tokens.refreshToken, tokens.accessToken, tokens.expiryDate?.toString() || '', tokens.email]
    );
    
    // Redirect back to settings page with success
    res.redirect('/settings?google=connected');
  } catch (err: any) {
    console.error('[Google Callback] Error:', err);
    res.redirect('/settings?google=error&message=' + encodeURIComponent(err.message));
  }
});

// Google OAuth - Status
app.get('/api/google/status', requireAdminAuth, async (req: AuthRequest, res) => {
  try {
    const [settingsRows]: any = await pool.query('SELECT google_oauth_refresh_token, google_calendar_email FROM settings WHERE id = ?', ['default']);
    const s = settingsRows[0];
    res.json({
      connected: !!(s?.google_oauth_refresh_token),
      email: s?.google_calendar_email || null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Get settings
async function getAppointmentSettings() {
  const [rows]: any = await pool.query('SELECT * FROM settings WHERE id = ?', ['default']);
  return rows[0] || {};
}

// Helper: Send notification emails to staff
async function sendStaffNotification(s: any, emailData: any) {
  if (!s.notification_emails) return;
  const emails = s.notification_emails.split(',').map((e: string) => e.trim()).filter(Boolean);
  if (emails.length === 0) return;
  
  const smtpHost = s.smtp_host || process.env.SMTP_HOST;
  const smtpPort = parseInt(s.smtp_port || process.env.SMTP_PORT || '465');
  const smtpUser = s.smtp_user || process.env.SMTP_USER;
  const smtpPass = s.smtp_pass || process.env.SMTP_PASS;
  if (!smtpHost || !smtpUser || !smtpPass) return;
  
  const transporter = nodemailer.createTransport({
    host: smtpHost, port: smtpPort, secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });
  
  const html = buildStaffNotificationEmail(emailData);
  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"Krishna Homoeopathic Clinic" <${smtpUser}>`,
        to: email,
        subject: `New Online Appointment - ${emailData.patientName} (${emailData.date} ${emailData.timeSlot})`,
        html
      });
    } catch (err) {
      console.error(`[StaffNotify] Failed to send to ${email}:`, err);
    }
  }
}

// Helper: Send email to patient
async function sendPatientEmail(s: any, to: string, subject: string, html: string) {
  const smtpHost = s.smtp_host || process.env.SMTP_HOST;
  const smtpPort = parseInt(s.smtp_port || process.env.SMTP_PORT || '465');
  const smtpUser = s.smtp_user || process.env.SMTP_USER;
  const smtpPass = s.smtp_pass || process.env.SMTP_PASS;
  if (!smtpHost || !smtpUser || !smtpPass) return;
  
  const transporter = nodemailer.createTransport({
    host: smtpHost, port: smtpPort, secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });
  
  await transporter.sendMail({
    from: `"Krishna Homoeopathic Clinic" <${smtpUser}>`,
    to, subject, html
  });
}

// Helper: Check 7-day follow-up eligibility across all sources
async function checkFollowUpEligibility(
  phone: string, 
  freeDays: number, 
  manualLastVisit?: string,
  patientName?: string,
  pid?: string
): Promise<{ 
  isEligible: boolean; 
  lastDate?: string; 
  lastHealthConcern?: string; 
  lastHealthConcernDetail?: string; 
  lastPatientName?: string; 
  clinicId?: string; 
  source?: string; 
}> {
  const now = new Date();
  
  // 1. Check manual last visit date if provided by patient
  if (manualLastVisit) {
    const manualDate = new Date(manualLastVisit);
    if (!isNaN(manualDate.getTime())) {
      const diffDays = Math.floor((now.getTime() - manualDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= freeDays) {
        return { isEligible: true, lastDate: manualLastVisit, source: 'manual_visit_date' };
      }
    }
  }

  if (phone || pid) {
    // 2. Check previous paid or completed online appointments
    try {
      let query = `SELECT appointment_date, health_concern, health_concern_detail, patient_name, clinic_id FROM online_appointments WHERE ((phone = ? AND phone != '') OR (clinic_id IS NOT NULL AND clinic_id != '' AND clinic_id = ?))`;
      const params: any[] = [phone || '', pid || ''];
      if (patientName) {
        query += ` AND LOWER(TRIM(patient_name)) = LOWER(TRIM(?))`;
        params.push(patientName);
      }
      query += ` AND (payment_status = 'paid' OR is_follow_up_free = 1) AND status IN ('confirmed','completed') ORDER BY appointment_date DESC LIMIT 1`;

      let [onlineRows]: any = await pool.query(query, params);

      // Fallback search without patientName if not found
      if (onlineRows.length === 0 && patientName) {
        const [fallbackRows]: any = await pool.query(
          `SELECT appointment_date, health_concern, health_concern_detail, patient_name, clinic_id FROM online_appointments WHERE ((phone = ? AND phone != '') OR (clinic_id IS NOT NULL AND clinic_id != '' AND clinic_id = ?)) AND (payment_status = 'paid' OR is_follow_up_free = 1) AND status IN ('confirmed','completed') ORDER BY appointment_date DESC LIMIT 1`,
          [phone || '', pid || '']
        );
        onlineRows = fallbackRows;
      }

      if (onlineRows.length > 0 && onlineRows[0].appointment_date) {
        const lastDate = new Date(onlineRows[0].appointment_date);
        if (!isNaN(lastDate.getTime())) {
          const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= freeDays) {
            return { 
              isEligible: true, 
              lastDate: onlineRows[0].appointment_date, 
              lastHealthConcern: onlineRows[0].health_concern,
              lastHealthConcernDetail: onlineRows[0].health_concern_detail,
              lastPatientName: onlineRows[0].patient_name,
              clinicId: onlineRows[0].clinic_id,
              source: 'online_appointments' 
            };
          }
        }
      }
    } catch (e) {
      console.error('[Eligibility] Online appointments check error:', e);
    }

    // 3. Check physical clinic patient registry
    try {
      const [regRows]: any = await pool.query(
        `SELECT clinic_id, full_name, last_visited, first_visit FROM patient_registry WHERE (phone = ? OR (clinic_id IS NOT NULL AND clinic_id = ?)) ORDER BY COALESCE(last_visited, first_visit) DESC LIMIT 1`,
        [phone || '', pid || '']
      );
      if (regRows.length > 0) {
        const visitDate = regRows[0].last_visited || regRows[0].first_visit;
        if (visitDate) {
          const lastDate = new Date(visitDate);
          if (!isNaN(lastDate.getTime())) {
            const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= freeDays) {
              return { 
                isEligible: true, 
                lastDate: lastDate.toISOString().split('T')[0], 
                lastPatientName: regRows[0].full_name,
                clinicId: regRows[0].clinic_id,
                source: 'patient_registry' 
              };
            }
          }
        }
      }
    } catch (e) {
      console.error('[Eligibility] Registry check error:', e);
    }

    // 4. Check in-clinic appointments
    try {
      const [aptRows]: any = await pool.query(
        `SELECT clinic_id, full_name, date FROM appointments WHERE (phone = ? OR (clinic_id IS NOT NULL AND clinic_id = ?)) ORDER BY date DESC LIMIT 1`,
        [phone || '', pid || '']
      );
      if (aptRows.length > 0 && aptRows[0].date) {
        const lastDate = new Date(aptRows[0].date);
        if (!isNaN(lastDate.getTime())) {
          const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= freeDays) {
            return { 
              isEligible: true, 
              lastDate: aptRows[0].date, 
              lastPatientName: aptRows[0].full_name,
              clinicId: aptRows[0].clinic_id,
              source: 'clinic_appointments' 
            };
          }
        }
      }
    } catch (e) {
      console.error('[Eligibility] Clinic appointments check error:', e);
    }
  }

  return { isEligible: false };
}

// Public configuration and pricing endpoint for booking wizard
app.get('/api/appointments/config', async (req, res) => {
  try {
    const s = await getAppointmentSettings();
    const normalFeePaise = s.consultation_fee !== undefined && s.consultation_fee !== null ? s.consultation_fee : 19900;
    const followUpFeePaise = s.follow_up_fee !== undefined && s.follow_up_fee !== null ? s.follow_up_fee : 0;
    const followUpDays = s.follow_up_free_days !== undefined && s.follow_up_free_days !== null ? s.follow_up_free_days : 7;

    const phone = (req.query.phone as string) || '';
    const name = (req.query.name as string) || (req.query.patientName as string) || '';
    const pid = (req.query.pid as string) || '';
    const lastVisitDate = (req.query.lastVisitDate as string) || '';

    let isFollowUp = false;
    let followUpDetails: any = null;
    let clinicId: string | null = pid || null;
    let activeAppointments: any[] = [];
    let activeAppointment: any = null;
    let hasActiveForSameName = false;

    if (phone.length === 10 || pid || lastVisitDate) {
      if (!clinicId && phone.length === 10) {
        try {
          const [pRows]: any = await pool.query(
            `SELECT clinic_id FROM patient_registry WHERE phone = ? ${name ? 'AND LOWER(TRIM(full_name)) = LOWER(TRIM(?))' : ''} LIMIT 1`,
            name ? [phone, name] : [phone]
          );
          if (pRows.length > 0) clinicId = pRows[0].clinic_id;
        } catch (e) {
          console.error('[Config] Error looking up PID:', e);
        }
      }

      followUpDetails = await checkFollowUpEligibility(phone, followUpDays, lastVisitDate, name, pid);
      isFollowUp = followUpDetails.isEligible;
      if (!clinicId && followUpDetails.clinicId) clinicId = followUpDetails.clinicId;

      // Check all active appointments on this phone number
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [activeRows]: any = await pool.query(
          `SELECT id, patient_name, phone, email, clinic_id, appointment_date, time_slot, slot_end, health_concern, status, meet_link 
           FROM online_appointments 
           WHERE (phone = ? AND phone != '')
             AND status IN ('confirmed', 'rescheduled')
             AND (appointment_date >= ? OR appointment_date IS NULL)
           ORDER BY appointment_date ASC, time_slot ASC`,
          [phone, todayStr]
        );

        activeAppointments = activeRows.map((act: any) => ({
          id: act.id,
          patientName: act.patient_name,
          phone: act.phone,
          email: act.email,
          clinicId: act.clinic_id,
          date: act.appointment_date,
          timeSlot: act.time_slot,
          slotEnd: act.slot_end,
          healthConcern: act.health_concern,
          status: act.status,
          meetLink: act.meet_link
        }));

        if (activeAppointments.length > 0) {
          activeAppointment = activeAppointments[0];
          if (name) {
            const matching = activeAppointments.find(a => a.patientName.trim().toLowerCase() === name.trim().toLowerCase());
            if (matching) {
              activeAppointment = matching;
              hasActiveForSameName = true;
            }
          }
        }
      } catch (actErr) {
        console.error('[Config] Error checking active appointments:', actErr);
      }
    }

    const calculatedFeePaise = isFollowUp ? followUpFeePaise : normalFeePaise;

    res.json({
      normalFee: normalFeePaise / 100,
      followUpFee: followUpFeePaise / 100,
      followUpDays,
      isFollowUp,
      calculatedFee: calculatedFeePaise / 100,
      isFree: calculatedFeePaise === 0,
      details: followUpDetails,
      lastHealthConcern: followUpDetails?.lastHealthConcern || null,
      lastHealthConcernDetail: followUpDetails?.lastHealthConcernDetail || null,
      lastVisitDate: followUpDetails?.lastDate || null,
      lastPatientName: followUpDetails?.lastPatientName || null,
      clinicId,
      activeAppointment,
      activeAppointments,
      hasActiveForSameName
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Generate next PID
async function generateClinicId(): Promise<string> {
  const [rows]: any = await pool.query(`SELECT clinic_id FROM patient_registry ORDER BY clinic_id DESC LIMIT 1`);
  let nextNum = 1;
  if (rows.length > 0) {
    const match = rows[0].clinic_id.match(/PID-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  return `PID-${String(nextNum).padStart(4, '0')}`;
}

// 1. Create Razorpay order
app.post('/api/appointments/create-order', async (req, res) => {
  const ip = getClientIp(req);
  // Rate limit: 10 per 15 min per IP
  const now = Date.now();
  if (!ipSubmissionTracker.has('apt_' + ip)) ipSubmissionTracker.set('apt_' + ip, []);
  const timestamps = ipSubmissionTracker.get('apt_' + ip)!.filter(t => now - t < 900000);
  if (timestamps.length >= 10) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  timestamps.push(now);
  ipSubmissionTracker.set('apt_' + ip, timestamps);
  
  try {
    const { 
      patientName, phone, email, patientType, shortAddress, lastVisitDate, pid, 
      isSameConcern, healthConcern, healthConcernDetail, wantsCourierMedicine, 
      courierAddress, courierContact, courierPincode 
    } = req.body;
    
    if (!patientName || !phone || !email || !patientType || !healthConcern) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Enforce: Multiple appointments can be made with same mobile, but name must be different!
    // Check if an active appointment already exists for the SAME patient name on this phone:
    const todayStr = new Date().toISOString().split('T')[0];
    const [existingActiveForName]: any = await pool.query(
      `SELECT id, patient_name, appointment_date, time_slot, health_concern, status, clinic_id 
       FROM online_appointments 
       WHERE (phone = ? AND phone != '')
         AND LOWER(TRIM(patient_name)) = LOWER(TRIM(?))
         AND status IN ('confirmed', 'rescheduled')
         AND (appointment_date >= ? OR appointment_date IS NULL)
       LIMIT 1`,
      [phone, patientName, todayStr]
    );

    if (existingActiveForName.length > 0) {
      return res.status(400).json({
        error: `An active appointment already exists for "${existingActiveForName[0].patient_name}". Each patient is limited to one active appointment at a time. To book for another family member on this phone number, enter a different patient name, or reschedule the existing appointment.`,
        activeAppointment: {
          id: existingActiveForName[0].id,
          patientName: existingActiveForName[0].patient_name,
          date: existingActiveForName[0].appointment_date,
          timeSlot: existingActiveForName[0].time_slot,
          healthConcern: existingActiveForName[0].health_concern,
          status: existingActiveForName[0].status,
          clinicId: existingActiveForName[0].clinic_id
        }
      });
    }
    
    const s = await getAppointmentSettings();
    const freeDays = s.follow_up_free_days !== undefined && s.follow_up_free_days !== null ? s.follow_up_free_days : 7;
    const eligibility = await checkFollowUpEligibility(phone, freeDays, lastVisitDate, patientName, pid);
    
    const normalFeePaise = s.consultation_fee !== undefined && s.consultation_fee !== null ? s.consultation_fee : 19900;
    const followUpFeePaise = s.follow_up_fee !== undefined && s.follow_up_fee !== null ? s.follow_up_fee : 0;

    let isFollowUp = false;
    let fee = normalFeePaise;
    let finalHealthConcern = healthConcern;
    let finalHealthConcernDetail = healthConcernDetail;
    let clinicId = pid || null;

    if (eligibility.isEligible) {
      if (isSameConcern !== false) {
        // YES: Same health concern -> Prefill concern, follow-up window fee
        isFollowUp = true;
        fee = followUpFeePaise;
        finalHealthConcern = eligibility.lastHealthConcern || healthConcern;
        finalHealthConcernDetail = eligibility.lastHealthConcernDetail || healthConcernDetail;
        if (!clinicId && eligibility.clinicId) clinicId = eligibility.clinicId;
      } else {
        // NO: Different health concern -> Continue as normal appointment, book on previous PID
        isFollowUp = false;
        fee = normalFeePaise;
        finalHealthConcern = healthConcern;
        finalHealthConcernDetail = healthConcernDetail;
        if (!clinicId && eligibility.clinicId) clinicId = eligibility.clinicId;
      }
    } else {
      isFollowUp = false;
      fee = normalFeePaise;
    }

    // If still no clinicId, check patient_registry for this patientName & phone
    if (!clinicId) {
      const [regRows]: any = await pool.query(
        `SELECT clinic_id FROM patient_registry WHERE phone = ? AND LOWER(TRIM(full_name)) = LOWER(TRIM(?)) LIMIT 1`,
        [phone, patientName]
      );
      if (regRows.length > 0) clinicId = regRows[0].clinic_id;
    }

    const isFree = fee === 0;
    const appointmentId = 'APT-' + crypto.randomUUID().substring(0, 8);
    
    await pool.query(
      `INSERT INTO online_appointments (id, patient_name, phone, email, patient_type, short_address, last_visit_date, clinic_id, health_concern, health_concern_detail, wants_courier_medicine, courier_address, courier_contact, courier_pincode, payment_amount, payment_status, is_follow_up_free, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_slot', NOW())`,
      [appointmentId, patientName, phone, email, patientType, shortAddress || null, lastVisitDate || null, clinicId || null, finalHealthConcern, finalHealthConcernDetail || null, wantsCourierMedicine || false, courierAddress || null, courierContact || phone, courierPincode || null, fee, isFree ? 'paid' : 'pending', isFollowUp]
    );
    
    if (isFree) {
      return res.json({ appointmentId, amount: 0, isFree: true, isFollowUp });
    }
    
    // Create Razorpay order
    const keyId = s.razorpay_key_id;
    const keySecret = s.razorpay_key_secret;
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Payment gateway not configured. Please contact the clinic.' });
    }
    
    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: fee,
      currency: 'INR',
      receipt: appointmentId,
      notes: { appointmentId, patientName, phone, isFollowUp: isFollowUp ? 'yes' : 'no' }
    });
    
    await pool.query(`UPDATE online_appointments SET razorpay_order_id = ? WHERE id = ?`, [order.id, appointmentId]);
    
    res.json({ appointmentId, orderId: order.id, amount: fee, currency: 'INR', keyId, isFollowUp, isFree: false });
  } catch (err: any) {
    console.error('[Appointment] Create order error:', err);
    res.status(500).json({ error: 'Failed to create appointment order' });
  }
});

// 2. Verify Razorpay payment
app.post('/api/appointments/verify-payment', async (req, res) => {
  try {
    const { appointmentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!appointmentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }
    
    const s = await getAppointmentSettings();
    const keySecret = s.razorpay_key_secret;
    if (!keySecret) return res.status(500).json({ error: 'Payment configuration error' });
    
    const expectedSig = crypto.createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    
    if (expectedSig !== razorpay_signature) {
      await pool.query(`UPDATE online_appointments SET payment_status = 'failed' WHERE id = ?`, [appointmentId]);
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    await pool.query(
      `UPDATE online_appointments SET razorpay_payment_id = ?, razorpay_signature = ?, payment_status = 'paid' WHERE id = ?`,
      [razorpay_payment_id, razorpay_signature, appointmentId]
    );
    
    res.json({ success: true, appointmentId });
  } catch (err: any) {
    console.error('[Appointment] Verify payment error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// 3. Get available slots
app.get('/api/appointments/available-slots', async (req, res) => {
  try {
    const date = req.query.date as string;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const targetDate = new Date(date + 'T00:00:00+05:30');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (targetDate < today) return res.status(400).json({ error: 'Cannot book past dates' });
    if (targetDate.getDay() === 3) return res.status(400).json({ error: 'Clinic is closed on Wednesdays' });
    
    // Max 30 days ahead
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    if (targetDate > maxDate) return res.status(400).json({ error: 'Cannot book more than 30 days ahead' });
    
    const allSlots = [
      { time: '11:00', end: '11:30', label: '11:00 AM' },
      { time: '11:30', end: '12:00', label: '11:30 AM' },
      { time: '12:00', end: '12:30', label: '12:00 PM' },
      { time: '12:30', end: '13:00', label: '12:30 PM' },
      { time: '13:00', end: '13:30', label: '1:00 PM' },
      { time: '13:30', end: '14:00', label: '1:30 PM' },
      { time: '17:30', end: '18:00', label: '5:30 PM' },
      { time: '18:00', end: '18:30', label: '6:00 PM' },
      { time: '18:30', end: '19:00', label: '6:30 PM' },
      { time: '19:00', end: '19:30', label: '7:00 PM' },
      { time: '19:30', end: '20:00', label: '7:30 PM' },
    ];
    
    const [booked]: any = await pool.query(
      `SELECT time_slot FROM online_appointments WHERE appointment_date = ? AND payment_status = 'paid' AND status IN ('confirmed', 'rescheduled')`,
      [date]
    );
    const bookedSlots = new Set(booked.map((r: any) => r.time_slot));
    
    // If today, filter out past slots
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const slots = allSlots.map(slot => {
      let available = !bookedSlots.has(slot.time);
      if (date === today.toISOString().split('T')[0]) {
        const [h, m] = slot.time.split(':').map(Number);
        const slotTime = new Date(nowIST);
        slotTime.setHours(h, m, 0, 0);
        if (slotTime <= nowIST) available = false;
      }
      return { ...slot, available };
    });
    
    res.json({ date, slots });
  } catch (err: any) {
    console.error('[Slots] Error:', err);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// 4. Book a slot (after payment)
app.post('/api/appointments/book-slot', async (req, res) => {
  try {
    const { appointmentId, date, timeSlot } = req.body;
    if (!appointmentId || !date || !timeSlot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify appointment exists and is paid
    const [aptRows]: any = await pool.query('SELECT * FROM online_appointments WHERE id = ?', [appointmentId]);
    if (aptRows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    const apt = aptRows[0];
    if (apt.payment_status !== 'paid') return res.status(400).json({ error: 'Payment not completed' });
    if (apt.appointment_date && apt.time_slot) return res.status(400).json({ error: 'Slot already booked' });
    
    // Check slot availability (race-condition safe)
    const [existing]: any = await pool.query(
      `SELECT id FROM online_appointments WHERE appointment_date = ? AND time_slot = ? AND payment_status = 'paid' AND status IN ('confirmed', 'rescheduled') FOR UPDATE`,
      [date, timeSlot]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'This slot was just booked by someone else. Please choose another.' });
    
    // Find slot end time
    const slotMap: Record<string, string> = {
      '11:00': '11:30', '11:30': '12:00', '12:00': '12:30', '12:30': '13:00',
      '13:00': '13:30', '13:30': '14:00', '17:30': '18:00', '18:00': '18:30',
      '18:30': '19:00', '19:00': '19:30', '19:30': '20:00'
    };
    const slotEnd = slotMap[timeSlot];
    if (!slotEnd) return res.status(400).json({ error: 'Invalid time slot' });
    
    // Generate Google Meet link
    let meetLink = '';
    let googleEventId = '';
    const s = await getAppointmentSettings();
    
    if (s.google_oauth_refresh_token) {
      try {
        const clientId = s.google_oauth_client_id || '715658585090-ijo4cn4qf0erak1jl2fucdstllqieosh.apps.googleusercontent.com';
        const clientSecret = s.google_oauth_client_secret || '';
        let accessToken = s.google_oauth_access_token || '';
        
        // Check if token needs refresh
        if (!accessToken || (s.google_oauth_token_expiry && new Date(s.google_oauth_token_expiry) <= new Date())) {
          const refreshed = await refreshAccessToken(clientId, clientSecret, s.google_oauth_refresh_token);
          accessToken = refreshed.accessToken;
          await pool.query(`UPDATE settings SET google_oauth_access_token = ?, google_oauth_token_expiry = ? WHERE id = 'default'`,
            [refreshed.accessToken, refreshed.expiryDate?.toString() || '']);
        }
        
        const meetResult = await createMeetEvent({
          accessToken, clientId, clientSecret,
          refreshToken: s.google_oauth_refresh_token,
          appointmentId, patientName: apt.patient_name,
          doctorEmail: s.google_calendar_email || '',
          date, timeSlot, slotEnd,
          healthConcern: apt.health_concern
        });
        meetLink = meetResult.meetLink;
        googleEventId = meetResult.eventId;
      } catch (meetErr) {
        console.error('[BookSlot] Google Meet creation failed, using fallback:', meetErr);
        meetLink = `https://meet.jit.si/krishna-clinic-${appointmentId}`;
      }
    } else {
      meetLink = `https://meet.jit.si/krishna-clinic-${appointmentId}`;
    }
    
    // Auto-generate PID for new patients / different family members
    let clinicId = apt.clinic_id;
    if (!clinicId) {
      const [existingPatient]: any = await pool.query(
        'SELECT clinic_id FROM patient_registry WHERE phone = ? AND LOWER(TRIM(full_name)) = LOWER(TRIM(?)) LIMIT 1', 
        [apt.phone, apt.patient_name]
      );
      if (existingPatient.length > 0) {
        clinicId = existingPatient[0].clinic_id;
      } else {
        clinicId = await generateClinicId();
        await pool.query(
          `INSERT INTO patient_registry (clinic_id, full_name, phone, email, age, gender, first_visit) VALUES (?, ?, ?, ?, 0, 'Not Specified', NOW())`,
          [clinicId, apt.patient_name, apt.phone, apt.email]
        );
      }
    }
    
    // Update appointment
    await pool.query(
      `UPDATE online_appointments SET appointment_date = ?, time_slot = ?, slot_end = ?, meet_link = ?, google_event_id = ?, clinic_id = ?, status = 'confirmed', updated_at = NOW() WHERE id = ?`,
      [date, timeSlot, slotEnd, meetLink, googleEventId, clinicId, appointmentId]
    );
    
    // Format time for display
    const [h, m] = timeSlot.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const timeLabel = `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`;
    
    const rescheduleUrl = `https://app.drsunilkumarbhms.in/reschedule`;
    
    // Send confirmation email
    try {
      const emailHtml = buildAppointmentConfirmationEmail({
        patientName: apt.patient_name, appointmentId, clinicId,
        date, timeSlot: timeLabel, healthConcern: apt.health_concern,
        paymentAmount: apt.payment_amount, paymentRef: apt.razorpay_payment_id || 'FREE',
        meetLink, rescheduleUrl
      });
      await sendPatientEmail(s, apt.email, `Appointment Confirmed - ${appointmentId}`, emailHtml);
      await pool.query(`UPDATE online_appointments SET confirmation_email_sent = true WHERE id = ?`, [appointmentId]);
    } catch (emailErr) {
      console.error('[BookSlot] Confirmation email failed:', emailErr);
    }
    
    // Send staff notification
    try {
      // Get file links if any
      const [files]: any = await pool.query('SELECT original_name, stored_path FROM appointment_files WHERE appointment_id = ?', [appointmentId]);
      const fileLinks = files.map((f: any) => ({ name: f.original_name, url: `https://app.drsunilkumarbhms.in/uploads/reports/${path.basename(f.stored_path)}` }));
      
      await sendStaffNotification(s, {
        patientName: apt.patient_name, phone: apt.phone, email: apt.email,
        appointmentId, clinicId, date, timeSlot: timeLabel,
        healthConcern: apt.health_concern, paymentAmount: apt.payment_amount,
        paymentRef: apt.razorpay_payment_id || 'FREE', patientType: apt.patient_type,
        fileLinks: fileLinks.length > 0 ? fileLinks : undefined,
        courierInfo: apt.wants_courier_medicine ? { address: apt.courier_address, pincode: apt.courier_pincode, contact: apt.courier_contact } : undefined
      });
    } catch (notifyErr) {
      console.error('[BookSlot] Staff notification failed:', notifyErr);
    }
    
    notifyClients();
    res.json({ success: true, appointmentId, clinicId, meetLink, date, timeSlot: timeLabel });
  } catch (err: any) {
    console.error('[BookSlot] Error:', err);
    res.status(500).json({ error: 'Failed to book slot' });
  }
});

// 5. Upload reports
app.post('/api/appointments/upload-reports', reportUpload.array('reports', 5), async (req: any, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) return res.status(400).json({ error: 'Missing appointmentId' });
    
    const [aptRows]: any = await pool.query('SELECT id FROM online_appointments WHERE id = ?', [appointmentId]);
    if (aptRows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    
    const files = req.files || [];
    const savedFiles = [];
    for (const file of files) {
      const fileId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO appointment_files (id, appointment_id, original_name, stored_path, mime_type, size_bytes, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [fileId, appointmentId, file.originalname, file.path, file.mimetype, file.size]
      );
      savedFiles.push({ id: fileId, name: file.originalname, size: file.size });
    }
    
    res.json({ files: savedFiles });
  } catch (err: any) {
    console.error('[Upload] Error:', err);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// 6. Get appointment files (staff only)
app.get('/api/appointments/files/:appointmentId', requireStaffAuth, async (req: AuthRequest, res) => {
  try {
    const [files]: any = await pool.query('SELECT * FROM appointment_files WHERE appointment_id = ?', [req.params.appointmentId]);
    res.json({ files: files.map((f: any) => ({ ...f, downloadUrl: `/uploads/reports/${path.basename(f.stored_path)}` })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded files (staff only)
app.use('/uploads/reports', requireStaffAuth, express.static(path.join(process.cwd(), 'uploads', 'reports')));

// 7. Patient lookup (for reschedule)
app.post('/api/appointments/lookup', async (req, res) => {
  const ip = getClientIp(req);
  const now = Date.now();
  if (!ipSubmissionTracker.has('lookup_' + ip)) ipSubmissionTracker.set('lookup_' + ip, []);
  const ts = ipSubmissionTracker.get('lookup_' + ip)!.filter(t => now - t < 900000);
  if (ts.length >= 10) return res.status(429).json({ error: 'Too many requests' });
  ts.push(now); ipSubmissionTracker.set('lookup_' + ip, ts);
  
  try {
    const { phone, appointmentId, pid } = req.body;
    if (!phone && !appointmentId && !pid) return res.status(400).json({ error: 'Phone number or Appointment ID required' });
    
    let clinicId = pid || null;
    if (!clinicId && phone) {
      const [regRows]: any = await pool.query(`SELECT clinic_id FROM patient_registry WHERE phone = ? LIMIT 1`, [phone]);
      if (regRows.length > 0) clinicId = regRows[0].clinic_id;
    }

    const today = new Date().toISOString().split('T')[0];
    const [rows]: any = await pool.query(
      `SELECT id, patient_name, email, clinic_id, appointment_date, time_slot, health_concern, status, meet_link 
       FROM online_appointments 
       WHERE (id = ? OR (phone = ? AND phone != '') OR (clinic_id IS NOT NULL AND clinic_id != '' AND clinic_id = ?)) 
         AND (appointment_date >= ? OR appointment_date IS NULL) 
         AND status IN ('confirmed', 'rescheduled') 
         AND payment_status = 'paid' 
       ORDER BY appointment_date ASC`,
      [appointmentId || '', phone || '', clinicId || '', today]
    );
    
    const appointments = rows.map((r: any) => {
      const email = r.email || '';
      const atIdx = email.indexOf('@');
      const maskedEmail = atIdx > 2 ? email.substring(0, 2) + '****' + email.substring(atIdx) : email.substring(0, 1) + '****';
      return {
        appointmentId: r.id, patientName: r.patient_name, maskedEmail,
        date: r.appointment_date, timeSlot: r.time_slot,
        healthConcern: r.health_concern, status: r.status, clinicId: r.clinic_id
      };
    });
    
    res.json({ appointments, clinicId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Reschedule - Send OTP
app.post('/api/appointments/reschedule/send-otp', async (req, res) => {
  const ip = getClientIp(req);
  const now = Date.now();
  if (!ipSubmissionTracker.has('rotp_' + ip)) ipSubmissionTracker.set('rotp_' + ip, []);
  const ts = ipSubmissionTracker.get('rotp_' + ip)!.filter(t => now - t < 600000);
  if (ts.length >= 5) return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
  ts.push(now); ipSubmissionTracker.set('rotp_' + ip, ts);
  
  try {
    const { appointmentId } = req.body;
    const [aptRows]: any = await pool.query('SELECT email, patient_name FROM online_appointments WHERE id = ? AND status IN (\'confirmed\', \'rescheduled\')', [appointmentId]);
    if (aptRows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    
    const apt = aptRows[0];
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await pool.query(
      `INSERT INTO reschedule_otps (id, appointment_id, email, otp, expires_at, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
      [otpId, appointmentId, apt.email, otp, expiresAt]
    );
    
    const s = await getAppointmentSettings();
    const emailHtml = buildRescheduleOtpEmail({ patientName: apt.patient_name, otp });
    await sendPatientEmail(s, apt.email, `Reschedule OTP - ${otp}`, emailHtml);
    
    const email = apt.email;
    const atIdx = email.indexOf('@');
    const maskedEmail = atIdx > 2 ? email.substring(0, 2) + '****' + email.substring(atIdx) : email.substring(0, 1) + '****';
    
    res.json({ otpSent: true, maskedEmail });
  } catch (err: any) {
    console.error('[Reschedule OTP] Error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// 9. Reschedule - Verify OTP
app.post('/api/appointments/reschedule/verify-otp', async (req, res) => {
  try {
    const { appointmentId, otp } = req.body;
    const [otpRows]: any = await pool.query(
      `SELECT * FROM reschedule_otps WHERE appointment_id = ? AND verified = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [appointmentId]
    );
    if (otpRows.length === 0) return res.status(400).json({ error: 'OTP expired or not found. Please request a new one.' });
    
    const otpRecord = otpRows[0];
    if (otpRecord.attempts >= 5) return res.status(400).json({ error: 'Too many failed attempts. Request a new OTP.' });
    
    if (otpRecord.otp !== otp) {
      await pool.query(`UPDATE reschedule_otps SET attempts = attempts + 1 WHERE id = ?`, [otpRecord.id]);
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    await pool.query(`UPDATE reschedule_otps SET verified = true WHERE id = ?`, [otpRecord.id]);
    
    // Generate a short-lived reschedule token (30 min)
    const tokenPayload = JSON.stringify({ appointmentId, exp: Date.now() + 30 * 60 * 1000 });
    const tokenB64 = Buffer.from(tokenPayload).toString('base64url');
    const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'khc-super-secret-auth-key-salt-924219762788').update(tokenB64).digest('base64url');
    const rescheduleToken = `${tokenB64}.${sig}`;
    
    res.json({ verified: true, rescheduleToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Reschedule - Confirm new slot
app.post('/api/appointments/reschedule/confirm', async (req, res) => {
  try {
    const { appointmentId, rescheduleToken, newDate, newTimeSlot } = req.body;
    if (!appointmentId || !rescheduleToken || !newDate || !newTimeSlot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify token
    const [tokenB64, sig] = rescheduleToken.split('.');
    const expectedSig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'khc-super-secret-auth-key-salt-924219762788').update(tokenB64).digest('base64url');
    if (sig !== expectedSig) return res.status(400).json({ error: 'Invalid reschedule token' });
    
    const tokenData = JSON.parse(Buffer.from(tokenB64, 'base64url').toString());
    if (tokenData.exp < Date.now()) return res.status(400).json({ error: 'Reschedule token expired' });
    if (tokenData.appointmentId !== appointmentId) return res.status(400).json({ error: 'Token mismatch' });
    
    // Get current appointment
    const [aptRows]: any = await pool.query('SELECT * FROM online_appointments WHERE id = ?', [appointmentId]);
    if (aptRows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    const apt = aptRows[0];
    
    // Enforce 1-hour-prior policy
    if (apt.appointment_date && apt.time_slot) {
      const [h, m] = apt.time_slot.split(':').map(Number);
      const aptTime = new Date(apt.appointment_date + 'T' + apt.time_slot + ':00+05:30');
      const oneHourBefore = new Date(aptTime.getTime() - 60 * 60 * 1000);
      if (new Date() > oneHourBefore) {
        return res.status(400).json({ error: 'Cannot reschedule within 1 hour of appointment time' });
      }
    }
    
    // Check new slot availability
    const [existing]: any = await pool.query(
      `SELECT id FROM online_appointments WHERE appointment_date = ? AND time_slot = ? AND payment_status = 'paid' AND status IN ('confirmed', 'rescheduled') AND id != ? FOR UPDATE`,
      [newDate, newTimeSlot, appointmentId]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Slot no longer available' });
    
    const slotMap: Record<string, string> = {
      '11:00': '11:30', '11:30': '12:00', '12:00': '12:30', '12:30': '13:00',
      '13:00': '13:30', '13:30': '14:00', '17:30': '18:00', '18:00': '18:30',
      '18:30': '19:00', '19:00': '19:30', '19:30': '20:00'
    };
    const newSlotEnd = slotMap[newTimeSlot];
    if (!newSlotEnd) return res.status(400).json({ error: 'Invalid time slot' });
    
    // Update Google Calendar event or create new
    let meetLink = apt.meet_link;
    let googleEventId = apt.google_event_id;
    const s = await getAppointmentSettings();
    
    if (s.google_oauth_refresh_token) {
      try {
        const clientId = s.google_oauth_client_id || '';
        const clientSecret = s.google_oauth_client_secret || '';
        let accessToken = s.google_oauth_access_token || '';
        
        if (!accessToken || (s.google_oauth_token_expiry && new Date(s.google_oauth_token_expiry) <= new Date())) {
          const refreshed = await refreshAccessToken(clientId, clientSecret, s.google_oauth_refresh_token);
          accessToken = refreshed.accessToken;
          await pool.query(`UPDATE settings SET google_oauth_access_token = ?, google_oauth_token_expiry = ? WHERE id = 'default'`,
            [refreshed.accessToken, refreshed.expiryDate?.toString() || '']);
        }
        
        if (googleEventId) {
          const updated = await updateMeetEvent({
            accessToken, clientId, clientSecret,
            refreshToken: s.google_oauth_refresh_token,
            doctorEmail: s.google_calendar_email || '',
            eventId: googleEventId,
            patientName: apt.patient_name,
            date: newDate, timeSlot: newTimeSlot, slotEnd: newSlotEnd,
            healthConcern: apt.health_concern
          });
          meetLink = updated.meetLink;
          googleEventId = updated.eventId;
        } else {
          const created = await createMeetEvent({
            accessToken, clientId, clientSecret,
            refreshToken: s.google_oauth_refresh_token,
            appointmentId, patientName: apt.patient_name,
            doctorEmail: s.google_calendar_email || '',
            date: newDate, timeSlot: newTimeSlot, slotEnd: newSlotEnd,
            healthConcern: apt.health_concern
          });
          meetLink = created.meetLink;
          googleEventId = created.eventId;
        }
      } catch (meetErr) {
        console.error('[Reschedule] Google Meet update failed:', meetErr);
      }
    }
    
    // Update appointment
    await pool.query(
      `UPDATE online_appointments SET appointment_date = ?, time_slot = ?, slot_end = ?, meet_link = ?, google_event_id = ?, status = 'rescheduled', reschedule_count = reschedule_count + 1, reminder_2h_sent = false, reminder_1h_sent = false, updated_at = NOW() WHERE id = ?`,
      [newDate, newTimeSlot, newSlotEnd, meetLink, googleEventId, appointmentId]
    );
    
    // Format time
    const [h, m2] = newTimeSlot.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const timeLabel = `${displayHour}:${String(m2).padStart(2, '0')} ${ampm}`;
    const rescheduleUrl = 'https://app.drsunilkumarbhms.in/reschedule';
    
    // Send reschedule confirmation email
    try {
      const emailHtml = buildAppointmentRescheduleEmail({
        patientName: apt.patient_name, appointmentId,
        newDate: newDate, newTimeSlot: timeLabel,
        healthConcern: apt.health_concern, meetLink, rescheduleUrl
      });
      await sendPatientEmail(s, apt.email, `Appointment Rescheduled - ${appointmentId}`, emailHtml);
    } catch (e) { console.error('[Reschedule] Email failed:', e); }
    
    // Staff notification
    try {
      await sendStaffNotification(s, {
        patientName: apt.patient_name, phone: apt.phone, email: apt.email,
        appointmentId, clinicId: apt.clinic_id, date: newDate, timeSlot: timeLabel,
        healthConcern: apt.health_concern, paymentAmount: apt.payment_amount,
        paymentRef: apt.razorpay_payment_id || 'FREE', patientType: apt.patient_type
      });
    } catch (e) { console.error('[Reschedule] Staff notification failed:', e); }
    
    notifyClients();
    res.json({ success: true, appointmentId, newDate, newTimeSlot: timeLabel, meetLink });
  } catch (err: any) {
    console.error('[Reschedule] Error:', err);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// 11. Get all online appointments (dashboard - staff)
app.get('/api/online-appointments', requireStaffAuth, async (req: AuthRequest, res) => {
  try {
    const { status, date, search } = req.query;
    let query = 'SELECT * FROM online_appointments WHERE 1=1';
    const params: any[] = [];
    
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (date) { query += ' AND appointment_date = ?'; params.push(date); }
    if (search) {
      query += ' AND (patient_name LIKE ? OR phone LIKE ? OR id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    query += ' ORDER BY created_at DESC';
    
    const [rows]: any = await pool.query(query, params);
    
    // Attach file counts
    for (const row of rows) {
      const [files]: any = await pool.query('SELECT COUNT(*) as count FROM appointment_files WHERE appointment_id = ?', [row.id]);
      row.fileCount = files[0]?.count || 0;
    }
    
    res.json({ appointments: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark online appointment as completed
app.patch('/api/online-appointments/:id/complete', requireStaffAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE online_appointments SET status = 'completed', updated_at = NOW() WHERE id = ?`, [id]);
    notifyClients();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete online appointment (staff/admin)
app.delete('/api/online-appointments/:id', requireStaffAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const [aptRows]: any = await pool.query('SELECT * FROM online_appointments WHERE id = ?', [id]);
    if (aptRows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    const apt = aptRows[0];

    // Delete Google Calendar event if any
    try {
      const s = await getAppointmentSettings();
      if (apt.google_event_id && s.google_oauth_refresh_token) {
        let accessToken = s.google_oauth_access_token || '';
        if (!accessToken || (s.google_oauth_token_expiry && new Date(s.google_oauth_token_expiry) <= new Date())) {
          const refreshed = await refreshAccessToken(s.google_oauth_client_id, s.google_oauth_client_secret, s.google_oauth_refresh_token);
          accessToken = refreshed.accessToken;
        }
        await deleteMeetEvent({
          accessToken,
          clientId: s.google_oauth_client_id,
          clientSecret: s.google_oauth_client_secret,
          refreshToken: s.google_oauth_refresh_token,
          doctorEmail: s.google_calendar_email || '',
          eventId: apt.google_event_id
        });
      }
    } catch (e) {
      console.error('[Delete] Calendar delete failed:', e);
    }

    // Delete associated files from disk and DB
    const [files]: any = await pool.query('SELECT stored_path FROM appointment_files WHERE appointment_id = ?', [id]);
    for (const f of files) {
      if (f.stored_path && fs.existsSync(f.stored_path)) {
        try { fs.unlinkSync(f.stored_path); } catch (e) {}
      }
    }
    await pool.query('DELETE FROM appointment_files WHERE appointment_id = ?', [id]);
    await pool.query('DELETE FROM reschedule_otps WHERE appointment_id = ?', [id]);
    await pool.query('DELETE FROM online_appointments WHERE id = ?', [id]);

    notifyClients();
    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (err: any) {
    console.error('[Delete Appointment] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 12. Refund or Cancel appointment (admin)
app.post('/api/appointments/refund', requireAdminAuth, async (req: AuthRequest, res) => {
  try {
    const { appointmentId } = req.body;
    const [aptRows]: any = await pool.query('SELECT * FROM online_appointments WHERE id = ?', [appointmentId]);
    if (aptRows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    const apt = aptRows[0];
    
    if (apt.payment_status === 'refunded') return res.status(400).json({ error: 'Already refunded' });
    
    const s = await getAppointmentSettings();

    // Delete Google Calendar event if any
    if (apt.google_event_id && s.google_oauth_refresh_token) {
      try {
        let accessToken = s.google_oauth_access_token || '';
        if (!accessToken || (s.google_oauth_token_expiry && new Date(s.google_oauth_token_expiry) <= new Date())) {
          const refreshed = await refreshAccessToken(s.google_oauth_client_id, s.google_oauth_client_secret, s.google_oauth_refresh_token);
          accessToken = refreshed.accessToken;
        }
        await deleteMeetEvent({
          accessToken,
          clientId: s.google_oauth_client_id,
          clientSecret: s.google_oauth_client_secret,
          refreshToken: s.google_oauth_refresh_token,
          doctorEmail: s.google_calendar_email || '',
          eventId: apt.google_event_id
        });
      } catch (e) {
        console.error('[Refund] Calendar delete failed:', e);
      }
    }

    // Process refund if payment ID exists and was paid
    if (apt.razorpay_payment_id && apt.payment_status === 'paid') {
      try {
        const Razorpay = (await import('razorpay')).default;
        const rzp = new Razorpay({ key_id: s.razorpay_key_id, key_secret: s.razorpay_key_secret });
        await rzp.payments.refund(apt.razorpay_payment_id, { amount: apt.payment_amount });
      } catch (rzpErr) {
        console.error('[Refund] Razorpay refund error:', rzpErr);
      }
      
      await pool.query(`UPDATE online_appointments SET payment_status = 'refunded', status = 'cancelled', updated_at = NOW() WHERE id = ?`, [appointmentId]);
      
      try {
        const emailHtml = buildRefundEmail({
          patientName: apt.patient_name, appointmentId,
          date: apt.appointment_date, timeSlot: apt.time_slot,
          refundAmount: apt.payment_amount, paymentRef: apt.razorpay_payment_id
        });
        await sendPatientEmail(s, apt.email, `Appointment Cancelled & Refund Initiated - ${appointmentId}`, emailHtml);
      } catch (e) {
        console.error('[Refund] Email failed:', e);
      }
      
      notifyClients();
      return res.json({ success: true, message: 'Refund initiated successfully' });
    } else {
      // Unpaid or free appointment - cancel directly
      await pool.query(`UPDATE online_appointments SET status = 'cancelled', updated_at = NOW() WHERE id = ?`, [appointmentId]);
      notifyClients();
      return res.json({ success: true, message: 'Appointment cancelled successfully' });
    }
  } catch (err: any) {
    console.error('[Refund] Error:', err);
    res.status(500).json({ error: 'Failed to process cancellation/refund' });
  }
});

// 13. Patient booking history
app.post('/api/appointments/history', async (req, res) => {
  try {
    const { phone, pid } = req.body;
    if (!phone && !pid) return res.status(400).json({ error: 'Phone or PID required' });

    let clinicId = pid || null;
    if (!clinicId && phone) {
      const [pRows]: any = await pool.query(
        `SELECT clinic_id FROM patient_registry WHERE phone = ? LIMIT 1`,
        [phone]
      );
      if (pRows.length > 0) clinicId = pRows[0].clinic_id;
    }

    const [rows]: any = await pool.query(
      `SELECT id, appointment_date, time_slot, health_concern, status, payment_status, is_follow_up_free, clinic_id, created_at 
       FROM online_appointments 
       WHERE ((phone = ? AND phone != '') OR (clinic_id IS NOT NULL AND clinic_id != '' AND clinic_id = ?)) 
         AND payment_status = 'paid' 
       ORDER BY created_at DESC LIMIT 10`,
      [phone || '', clinicId || '']
    );

    const history = rows.map((r: any) => ({
      id: r.id,
      date: r.appointment_date,
      time: r.time_slot,
      healthConcern: r.health_concern,
      status: r.status,
      paymentStatus: r.payment_status,
      isFollowUpFree: Boolean(r.is_follow_up_free),
      clinicId: r.clinic_id,
      createdAt: r.created_at
    }));

    res.json({ history, clinicId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== CRON JOBS =====

// Auto-cancel unpaid orders older than 30 minutes (every 5 min)
setInterval(async () => {
  try {
    await pool.query(
      `UPDATE online_appointments SET status = 'cancelled' WHERE payment_status = 'pending' AND status = 'pending_slot' AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
    );
  } catch (e) { console.error('[Cron] Auto-cancel error:', e); }
}, 5 * 60 * 1000);

// Appointment reminders (every 5 min)
setInterval(async () => {
  try {
    const s = await getAppointmentSettings();
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // 2-hour reminders
    const [twoHrRows]: any = await pool.query(
      `SELECT * FROM online_appointments WHERE status IN ('confirmed', 'rescheduled') AND payment_status = 'paid' AND reminder_2h_sent = false AND appointment_date IS NOT NULL AND time_slot IS NOT NULL`
    );
    for (const apt of twoHrRows) {
      const aptTime = new Date(apt.appointment_date + 'T' + apt.time_slot + ':00+05:30');
      const diffMs = aptTime.getTime() - Date.now();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours <= 2 && diffHours > 1) {
        try {
          const [h, m] = apt.time_slot.split(':').map(Number);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
          const timeLabel = `${dh}:${String(m).padStart(2, '0')} ${ampm}`;
          const emailHtml = buildReminderEmail({
            patientName: apt.patient_name, appointmentId: apt.id,
            date: apt.appointment_date, timeSlot: timeLabel,
            meetLink: apt.meet_link, hoursUntil: 2,
            rescheduleUrl: 'https://app.drsunilkumarbhms.in/reschedule'
          });
          await sendPatientEmail(s, apt.email, `Reminder: Appointment in 2 hours - ${apt.id}`, emailHtml);
          await pool.query(`UPDATE online_appointments SET reminder_2h_sent = true WHERE id = ?`, [apt.id]);
        } catch (e) { console.error('[Cron] 2hr reminder failed:', e); }
      }
    }
    
    // 1-hour reminders
    const [oneHrRows]: any = await pool.query(
      `SELECT * FROM online_appointments WHERE status IN ('confirmed', 'rescheduled') AND payment_status = 'paid' AND reminder_1h_sent = false AND appointment_date IS NOT NULL AND time_slot IS NOT NULL`
    );
    for (const apt of oneHrRows) {
      const aptTime = new Date(apt.appointment_date + 'T' + apt.time_slot + ':00+05:30');
      const diffMs = aptTime.getTime() - Date.now();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours <= 1 && diffHours > 0) {
        try {
          const [h, m] = apt.time_slot.split(':').map(Number);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
          const timeLabel = `${dh}:${String(m).padStart(2, '0')} ${ampm}`;
          const emailHtml = buildReminderEmail({
            patientName: apt.patient_name, appointmentId: apt.id,
            date: apt.appointment_date, timeSlot: timeLabel,
            meetLink: apt.meet_link, hoursUntil: 1,
            rescheduleUrl: 'https://app.drsunilkumarbhms.in/reschedule'
          });
          await sendPatientEmail(s, apt.email, `Reminder: Appointment in 1 hour - ${apt.id}`, emailHtml);
          await pool.query(`UPDATE online_appointments SET reminder_1h_sent = true WHERE id = ?`, [apt.id]);
        } catch (e) { console.error('[Cron] 1hr reminder failed:', e); }
      }
    }
  } catch (e) { console.error('[Cron] Reminder error:', e); }
}, 5 * 60 * 1000);

// File cleanup - delete files for past appointments (daily check, runs every hour)
setInterval(async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [files]: any = await pool.query(
      `SELECT af.id, af.stored_path FROM appointment_files af JOIN online_appointments oa ON af.appointment_id = oa.id WHERE oa.appointment_date < ?`,
      [today]
    );
    for (const file of files) {
      try { fs.unlinkSync(file.stored_path); } catch (e) { /* file may already be deleted */ }
      await pool.query('DELETE FROM appointment_files WHERE id = ?', [file.id]);
    }
    if (files.length > 0) console.log(`[Cron] Cleaned up ${files.length} expired appointment files`);
  } catch (e) { console.error('[Cron] File cleanup error:', e); }
}, 60 * 60 * 1000);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  
  
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
