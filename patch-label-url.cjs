const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `  app.get('/api/delhivery/label-url/:awb', async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { awb } = req.params;
      
      const response = await fetch(\`https://track.delhivery.com/api/p/packing_slip?wbns=\${awb}&pdf=true&pdf_size=\`, {
        method: 'GET',
        headers: {
          'Authorization': \`Token \${s.delhiveryApiKey.trim()}\`,
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
  });`;

code = code.replace(
  /app\.get\('\/api\/delhivery\/label\/:awb\.pdf', async \(req, res\) => \{/,
  newEndpoint + "\n\n  app.get('/api/delhivery/label/:awb.pdf', async (req, res) => {"
);

fs.writeFileSync('server.ts', code);
