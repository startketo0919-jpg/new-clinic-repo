const fs = require('fs');
let code = fs.readFileSync('src/components/WhatsAppWidget.tsx', 'utf8');

code = code.replace(
  /const chatList = getChatList\(\);/g,
  `const chatList = getChatList().filter(c => c.phone !== 'SYSTEM');`
);

fs.writeFileSync('src/components/WhatsAppWidget.tsx', code);
