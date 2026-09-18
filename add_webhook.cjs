const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const webhookCode = `
  // WhatsApp Webhook Verification (GET)
  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = "clinic_secure_token_2026";

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WhatsApp Webhook Verified!');
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // WhatsApp Webhook Event Receiver (POST)
  app.post('/api/whatsapp/webhook', (req, res) => {
    const body = req.body;
    console.log("Incoming WhatsApp Message/Event:", JSON.stringify(body, null, 2));
    res.sendStatus(200);
  });

`;

code = code.replace(/app\.post\("\/api\/action", async \(req, res\) => \{/, webhookCode + 'app.post("/api/action", async (req, res) => {');

fs.writeFileSync('server.ts', code);
