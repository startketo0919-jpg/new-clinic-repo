const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.post\('\/api\/delhivery\/pickup', async \(req, res\) => \{([\s\S]*?)\s*res\.json\(data\);\s*\} catch \(e\) \{\s*res\.status\(500\)\.json\(\{ error: e\.message \}\);\s*\}\s*\}\);/;

const replacement = `app.post('/api/delhivery/pickup', async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { pickup_date, pickup_location, expected_package_count } = req.body;
      
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      const tmrDateStr = tmr.toISOString().split('T')[0];
      
      const slotsToTry = [
         { date: pickup_date, time: '10:00:00' },
         { date: pickup_date, time: '14:00:00' },
         { date: tmrDateStr, time: '10:00:00' }
      ];
      
      let finalData = null;
      for (const slot of slotsToTry) {
          const response = await fetch('https://track.delhivery.com/fm/request/new/', {
            method: 'POST',
            headers: {
              'Authorization': \`Token \${s.delhiveryApiKey.trim()}\`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              pickup_time: slot.time,
              pickup_date: slot.date,
              pickup_location,
              expected_package_count
            })
          });
          finalData = await response.json();
          
          if (finalData.pickup_id !== undefined || finalData.pr_id !== undefined || finalData.success) {
             finalData._scheduled_date = slot.date;
             finalData._scheduled_time = slot.time;
             break;
          }
          
          // If the error is NOT about time/slot, maybe we shouldn't retry? 
          // Usually if it's an auth error or location error, it will fail all 3 times quickly, which is fine.
          // But to be safe, if we get a successful response format we stop.
      }
      
      res.json(finalData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });`;

code = code.replace(regex, replacement);

fs.writeFileSync('server.ts', code);
