const fs = require('fs');
let code = fs.readFileSync('src/components/DelhiveryCourier.tsx', 'utf8');

code = code.replace(
  "setManageResult(`Label URL: https://track.delhivery.com/api/p/packagelabels/pb/?wbns=${manageAwb}`);",
  "const url = `${window.location.origin}/api/delhivery/label/${manageAwb}.pdf`;\n        window.open(url, '_blank');\n        setManageResult(`Label opened in new tab: ${url}`);"
);

fs.writeFileSync('src/components/DelhiveryCourier.tsx', code);
