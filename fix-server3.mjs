import fs from 'fs';
let lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const { waybill } = req.body;') && lines[i-1] && lines[i-1].includes('});') && lines[i+2] && lines[i+2].includes('fetch(`https://track.delhivery.com/api/p/packing_slip')) {
    skip = true;
  }
  
  if (skip && lines[i].includes("app.get('/api/delhivery/label/:awb.pdf'")) {
    skip = false;
  }
  
  if (!skip) {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync('server.ts', newLines.join('\n'));
