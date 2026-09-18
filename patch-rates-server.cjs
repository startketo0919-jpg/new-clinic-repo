const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldEndpoint = `  app.post('/api/delhivery/rates', requireAuth, async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { pickup_pincode, delivery_pincode, weight, mode } = req.body;
      
      // Call real API (simulated/mock response if exact params not perfectly matched, or proxy to actual if we know it)
      // Delhivery typically uses /api/kinko/v1/invoice/charges.json
      const response = await fetch(\`https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=\${mode === 'Express' ? 'E' : 'S'}&ss=Delivered&d_pin=\${delivery_pincode}&o_pin=\${pickup_pincode}&cgm=\${weight}&pt=Pre-paid\`, {
        headers: {
          'Authorization': \`Token \${s.delhiveryApiKey}\`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });`;

const newEndpoint = `  app.post('/api/delhivery/rates', requireAuth, async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { pickup_pincode, delivery_pincode, weight } = req.body;
      
      const getRate = async (mode) => {
        const url = \`https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=\${mode}&ss=Delivered&d_pin=\${delivery_pincode}&o_pin=\${pickup_pincode}&cgm=\${weight}&pt=Pre-paid\`;
        const response = await fetch(url, {
          headers: {
            'Authorization': \`Token \${s.delhiveryApiKey}\`,
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
  });`;

code = code.replace(oldEndpoint, newEndpoint);

fs.writeFileSync('server.ts', code);
