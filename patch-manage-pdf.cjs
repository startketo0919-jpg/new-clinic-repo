const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

const regex = /else if \(action === 'pdf'\) \{[\s\S]*?setManageResult\(\`Label opened in new tab: \$\{url\}\`\);\s*\}/;

const newBlock = `else if (action === 'pdf') {
        const res = await fetch(\`/api/delhivery/label-url/\${manageAwb}\`);
        const data = await res.json();
        if (data.url) {
            if (data.url.startsWith('data:')) {
                const a = document.createElement('a');
                a.href = data.url;
                a.download = \`\${manageAwb}.pdf\`;
                a.click();
                setManageResult('Downloaded Label PDF.');
            } else {
                window.open(data.url, '_blank');
                setManageResult(\`Label opened in new tab: \${data.url}\`);
            }
        } else {
            setManageResult('Could not fetch label URL.');
        }
      }`;

code = code.replace(regex, newBlock);
fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
