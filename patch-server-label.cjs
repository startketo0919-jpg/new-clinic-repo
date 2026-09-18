const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `  app.post('/api/delhivery/label', async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { waybill } = req.body;
      
      const response = await fetch(\`https://track.delhivery.com/api/p/packing_slip?wbns=\${waybill}&pdf=true\`, {
        method: 'GET',
        headers: {
          'Authorization': \`Token \${s.delhiveryApiKey.trim()}\`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });`;

code = code.replace(
  /app\.get\('\/api\/delhivery\/orders', async \(req, res\) => \{/,
  newEndpoint + "\n\n  app.get('/api/delhivery/orders', async (req, res) => {"
);

fs.writeFileSync('server.ts', code);
