const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `  app.get('/api/delhivery/label/:awb.pdf', async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).send('Delhivery API Key not configured');
      
      const { awb } = req.params;
      
      const response = await fetch(\`https://track.delhivery.com/api/p/packing_slip?wbns=\${awb}&pdf=true\`, {
        method: 'GET',
        headers: {
          'Authorization': \`Token \${s.delhiveryApiKey.trim()}\`,
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
              const base64Data = link.replace(/^data:application\\/pdf;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', \`inline; filename="\${awb}.pdf"\`);
              return res.send(buffer);
          }
      }
      res.status(404).send('Label not found');
    } catch (e) {
      res.status(500).send(e.message);
    }
  });`;

// Remove the old POST /api/delhivery/label if it exists
code = code.replace(/app\.post\('\/api\/delhivery\/label'[\s\S]*?\}\);/, '');

code = code.replace(
  /app\.get\('\/api\/delhivery\/orders', async \(req, res\) => \{/,
  newEndpoint + "\n\n  app.get('/api/delhivery/orders', async (req, res) => {"
);

fs.writeFileSync('server.ts', code);
