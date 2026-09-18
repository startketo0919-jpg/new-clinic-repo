const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/app\.post\('\/api\/delhivery\/rates', requireAuth, async \(req, res\) => \{/g, "app.post('/api/delhivery/rates', async (req, res) => {");
code = code.replace(/app\.post\('\/api\/delhivery\/create', requireAuth, async \(req, res\) => \{/g, "app.post('/api/delhivery/create', async (req, res) => {");
code = code.replace(/app\.post\('\/api\/delhivery\/pickup', requireAuth, async \(req, res\) => \{/g, "app.post('/api/delhivery/pickup', async (req, res) => {");
code = code.replace(/app\.post\('\/api\/delhivery\/cancel', requireAuth, async \(req, res\) => \{/g, "app.post('/api/delhivery/cancel', async (req, res) => {");
code = code.replace(/app\.get\('\/api\/delhivery\/orders', requireAuth, async \(req, res\) => \{/g, "app.get('/api/delhivery/orders', async (req, res) => {");

fs.writeFileSync('server.ts', code);
