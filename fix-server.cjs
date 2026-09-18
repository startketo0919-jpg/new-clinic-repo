const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The broken snippet is right after the cancel endpoint:
const brokenSnippet = `                const { waybill } = req.body;
      
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
  });
  
  app.get('/api/delhivery/label/:awb.pdf', async (req, res) => {`;

code = code.replace(/ {16}const \{ waybill \} = req\.body;[\s\S]*?\}\n  \}\);\n  \n  app\.get\('\/api\/delhivery\/label\/:awb\.pdf', async \(req, res\) => \{/, "  app.get('/api/delhivery/label/:awb.pdf', async (req, res) => {");

fs.writeFileSync('server.ts', code);
