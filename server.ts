import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.js";
import { liveQueue, patientRegistry, users, appointments, settings, whatsappMessages, whatsappTemplates, delhiveryOrders } from "./src/db/schema.js";
import { eq, desc, asc, and } from "drizzle-orm";
// We don't enforce requireAuth for all actions since patients self-checkin, but we should in production.
import { requireAuth, AuthRequest } from "./src/middleware/auth.js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json());

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
      const dbMessages = await db.select().from(whatsappMessages).orderBy(whatsappMessages.timestamp);
      const dbTemplates = await db.select().from(whatsappTemplates);
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      let dbUsers = await db.select().from(users);

      if (!dbUsers.some(u => u.username === 'admin')) {
         const adminUser = { id: "1", username: 'admin', passwordHash: 'Suyash@0919', role: 'admin', email: 'skgservicesin@gmail.com' };
         await db.insert(users).values(adminUser);
         dbUsers = await db.select().from(users);
      }

      res.json({
        patients: dbPatients.map(p => ({ ...p, checkInTime: p.checkInTime.getTime(), completedTime: p.completedTime?.getTime() })),
        patientRegistry: dbRegistry.map(p => ({ ...p, firstVisit: p.firstVisit.getTime(), lastVisited: p.lastVisited?.getTime(), followUpDate: p.followUpDate?.getTime() })),
        appointments: dbAppointments,
        templates: dbTemplates,
        messages: dbMessages.map(m => ({...m, timestamp: m.timestamp.getTime()})),
        users: dbUsers,
        settings: dbSettings[0] || { 
          whatsappApiKey: "", whatsappPhoneId: "", currentPatientId: null, nextSequence: 1,
          waAutoRegisterSameDay: true, waAutoRegisterFuture: true, waAutoQueueAlert: true, waAutoFollowUp: true 
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch state" });
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
  
  app.post('/api/whatsapp/send', async (req, res) => {
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
        } catch(err) {
          console.error("DB Insert Error for inbound message:", err);
        }
      }
    }
    
    notifyClients(); // Tell React to fetch new messages
    res.sendStatus(200);
  });


const otpStore = new Map<string, { otp: string, expires: number }>();

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  
  try {
    const dbUsers = await db.select().from(users).where(eq(users.username, username.trim())).limit(1);
    const user = dbUsers[0];
    if (user && (user.passwordHash === password || (username.trim() === 'admin' && password === 'Suyash@0919'))) {
      return res.json({ success: true, user: { username: user.username, role: user.role } });
    }
    if (username.trim() === 'admin' && password === 'Suyash@0919') {
      return res.json({ success: true, user: { username: 'admin', role: 'admin' } });
    }
    res.status(401).json({ error: 'Invalid username or password' });
  } catch (err) {
    console.error('Login error', err);
    if (username.trim() === 'admin' && password === 'Suyash@0919') {
      return res.json({ success: true, user: { username: 'admin', role: 'admin' } });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/send-otp', async (req, res) => {
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
  const stored = otpStore.get(email);

  if (!stored) return res.status(400).json({ error: 'OTP not found or expired' });
  if (Date.now() > stored.expires) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP expired' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

  otpStore.delete(email);
  res.json({ success: true });
});

app.post("/api/action", async (req, res) => {
    try {
      const { type, payload } = req.body;

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
        await db.insert(users).values(payload);
      }
      else if (type === 'DELETE_USER') {
        const userToDelete = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
        if (userToDelete.length > 0 && userToDelete[0].username !== 'admin') {
          await db.delete(users).where(eq(users.id, payload.id));
        }
      }
      else if (type === 'UPDATE_USER_PASSWORD') {
        await db.update(users).set({ passwordHash: payload.newPassword }).where(eq(users.username, payload.username));
      }
      else if (type === 'UPDATE_USER_EMAIL') {
        await db.update(users).set({ email: payload.email }).where(eq(users.id, payload.id));
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

  
  app.post('/api/whatsapp/templates', async (req, res) => {
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
  app.post('/api/delhivery/rates', async (req, res) => {
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

  app.post('/api/delhivery/create', async (req, res) => {
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
      const awb = pkg?.waybill || data.upload_wbn || data.waybill || null;
      
      // Save locally if created or waybill exists, without failing the request on DB conflict
      if (awb || data.success || (pkg && pkg.status === 'Success')) {
        try {
          const recordId = awb ? String(awb) : `ORDER_${orderId}_${Date.now()}`;
          await db.insert(delhiveryOrders).values({
            id: recordId,
            orderId: String(orderId),
            awb: awb || null,
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
          }).onConflictDoUpdate({
            target: delhiveryOrders.id,
            set: {
              awb: awb || null,
              status: 'Manifested',
              consigneeName: name || '',
              consigneePhone: phone || '',
              consigneeAddress: address || '',
              consigneePincode: String(pincode || ''),
              weight: Number(weight) || 500,
              length: Number(length) || 10,
              width: Number(width) || 10,
              height: Number(height) || 10,
              paymentMode: paymentMode || 'Prepaid',
              items: JSON.stringify(items || [])
            }
          });
        } catch (dbErr) {
          console.error('Database write warning (Delhivery order placed successfully):', dbErr);
        }
      }
      
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.post('/api/delhivery/pickup', async (req, res) => {
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


      app.get('/api/delhivery/label-url/:awb', async (req, res) => {
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

  app.get('/api/delhivery/label/:awb.pdf', async (req, res) => {
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
              return res.redirect(link);
          } else {
              // It's a base64 string (usually starts with JVBER)
              const base64Data = link.replace(/^data:application\/pdf;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `inline; filename="${awb}.pdf"`);
              return res.send(buffer);
          }
      }
      res.status(404).send('Label not found');
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  app.get('/api/delhivery/orders', async (req, res) => {
    try {
      
      const orders = await db.select().from(delhiveryOrders).orderBy(desc(delhiveryOrders.timestamp));
      res.json(orders);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  

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
