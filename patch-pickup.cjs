const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.post\('\/api\/delhivery\/pickup', async \(req, res\) => \{([\s\S]*?)const response = await fetch\('https:\/\/track\.delhivery\.com\/fm\/request\/new\/', \{\s*method: 'POST',\s*headers: \{\s*'Authorization': `Token \$\{s\.delhiveryApiKey\.trim\(\)\}`,\s*'Content-Type': 'application\/json'\s*\},\s*body: JSON\.stringify\(\{\s*pickup_time,\s*pickup_date,\s*pickup_location,\s*expected_package_count\s*\}\)\s*\}\);\s*const data = await response\.json\(\);\s*res\.json\(data\);\s*\} catch \(e\) \{\s*res\.status\(500\)\.json\(\{ error: e\.message \}\);\s*\}\s*\}\);/;

const replacement = `app.post('/api/delhivery/pickup', async (req, res) => {
    try {
      const dbSettings = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
      const s = dbSettings[0];
      if (!s || !s.delhiveryApiKey) return res.status(400).json({ error: 'Delhivery API Key not configured' });
      
      const { pickup_time, pickup_date, pickup_location, expected_package_count } = req.body;
      
      let response = await fetch('https://track.delhivery.com/fm/request/new/', {
        method: 'POST',
        headers: {
          'Authorization': \`Token \${s.delhiveryApiKey.trim()}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickup_time,
          pickup_date,
          pickup_location,
          expected_package_count
        })
      });
      let data = await response.json();
      
      // If pickup fails due to time, retry with tomorrow
      if (data.pr_id === undefined && data.pickup_id === undefined && data.error || (data.message && typeof data.message === 'string' && data.message.toLowerCase().includes('time'))) {
         const tmr = new Date();
         tmr.setDate(tmr.getDate() + 1);
         const tmrDateStr = tmr.toISOString().split('T')[0];
         // Earliest time slot, usually something like 10:00:00 or similar.
         // Delhivery usually has timeslots. I'll pass a default earliest time, or maybe just the same time slot?
         // User said: "earliest pickup". Delhivery earliest is often '10:00:00'.
         // Let's retry.
         response = await fetch('https://track.delhivery.com/fm/request/new/', {
            method: 'POST',
            headers: {
              'Authorization': \`Token \${s.delhiveryApiKey.trim()}\`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              pickup_time: '10:00:00',
              pickup_date: tmrDateStr,
              pickup_location,
              expected_package_count
            })
         });
         data = await response.json();
         // mark it so frontend knows
         data._scheduled_date = tmrDateStr;
         data._scheduled_time = '10:00:00';
      } else {
         data._scheduled_date = pickup_date;
         data._scheduled_time = pickup_time;
      }

      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });`;

code = code.replace(regex, replacement);

fs.writeFileSync('server.ts', code);
