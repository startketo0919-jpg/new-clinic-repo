const fs = require('fs');
let code = fs.readFileSync('src/components/WhatsAppWidget.tsx', 'utf8');

code = code.replace(
  /const messagesEndRef = useRef<HTMLDivElement>\(null\);/,
  `const messagesEndRef = useRef<HTMLDivElement>(null);\n  const messages = (state.messages || []).filter(m => m.phone !== 'SYSTEM');`
);

// also move the useEffect below it
code = code.replace(
  /\/\/ When opening a chat, mark as read[\s\S]*?\}, \[activeChatPhone, messages\]\);\n/,
  ''
);

code = code.replace(
  /const messagesEndRef = useRef<HTMLDivElement>\(null\);\n  const messages = \(state\.messages \|\| \[\]\)\.filter\(m => m\.phone !== 'SYSTEM'\);/,
  `const messagesEndRef = useRef<HTMLDivElement>(null);\n  const messages = (state.messages || []).filter(m => m.phone !== 'SYSTEM');\n\n  // When opening a chat, mark as read\n  useEffect(() => {\n    if (activeChatPhone) markAsRead(activeChatPhone);\n  }, [activeChatPhone, messages]);`
);

fs.writeFileSync('src/components/WhatsAppWidget.tsx', code);
