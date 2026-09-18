const fs = require('fs');
let code = fs.readFileSync('src/components/WhatsAppWidget.tsx', 'utf8');

// 1. Unread logic using localStorage
code = code.replace(
  /const \[activeChatPhone, setActiveChatPhone\] = useState<string \| null>\(null\);/,
  `const [activeChatPhone, setActiveChatPhone] = useState<string | null>(null);
  const [readMap, setReadMap] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const stored = localStorage.getItem('whatsappReadMap');
    if (stored) setReadMap(JSON.parse(stored));
  }, []);

  const markAsRead = (phone: string) => {
    const newMap = { ...readMap, [phone]: Date.now() };
    setReadMap(newMap);
    localStorage.setItem('whatsappReadMap', JSON.stringify(newMap));
  };

  // When opening a chat, mark as read
  useEffect(() => {
    if (activeChatPhone) markAsRead(activeChatPhone);
  }, [activeChatPhone, messages]);
`
);

// 2. Add unread badge logic in chat list
code = code.replace(
  /const chatList = .*?;/,
  `const chatList = (Object.values(chats) as { phone: string, messages: any[], lastMsgTime: number }[]).sort((a, b) => b.lastMsgTime - a.lastMsgTime);
  
  const getUnreadCount = (chat: any) => {
    const lastRead = readMap[chat.phone] || 0;
    return chat.messages.filter((m: any) => m.direction === 'inbound' && m.timestamp > lastRead).length;
  };
  
  const totalUnread = chatList.reduce((sum, chat) => sum + getUnreadCount(chat), 0);
`
);

// Add unread badge on main widget button
code = code.replace(
  /<MessageCircle className="w-8 h-8" \/>\n\s*<\/button>\n\s*<\/div>\n\s*\);\n}/,
  `<MessageCircle className="w-8 h-8" />
        {totalUnread > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
            {totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}`
);

// Update chat list rendering to show unread count and sender details
code = code.replace(
  /className="font-medium text-slate-800">\{getPatientName\(chat\.phone\)\}<\/h4>/,
  `className={\`font-medium \${getUnreadCount(chat) > 0 ? 'text-slate-900 font-bold' : 'text-slate-800'}\`}>{getPatientName(chat.phone)}</h4>`
);

code = code.replace(
  /className="text-xs text-slate-400">\{format\(new Date\(chat\.lastMsgTime\), 'h:mm a'\)\}<\/span>/,
  `className={\`text-xs \${getUnreadCount(chat) > 0 ? 'text-teal-600 font-bold' : 'text-slate-400'}\`}>{format(new Date(chat.lastMsgTime), 'h:mm a')}</span>`
);

code = code.replace(
  /<p className="text-sm text-slate-500 truncate mt-1">/,
  `{getUnreadCount(chat) > 0 && (
    <div className="bg-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ml-auto w-fit">
      {getUnreadCount(chat)} NEW
    </div>
  )}
  <p className={\`text-sm truncate mt-1 \${getUnreadCount(chat) > 0 ? 'text-slate-700 font-semibold' : 'text-slate-500'}\`}>`
);

// 3. Sender details in header
code = code.replace(
  /<span className="font-semibold">\{getPatientName\(activeChatPhone\)\}<\/span>\n\s*<\/div>/,
  `<div className="flex flex-col">
    <span className="font-semibold leading-tight">{getPatientName(activeChatPhone)}</span>
    <span className="text-[10px] text-teal-100">{activeChatPhone}</span>
  </div>
</div>`
);

// Add paperclip (attachment)
code = code.replace(
  /import \{ MessageCircle, X, Send, User \} from 'lucide-react';/,
  `import { MessageCircle, X, Send, User, Paperclip } from 'lucide-react';`
);

code = code.replace(
  /<input\n\s*type="text"\n\s*placeholder="Type a message\.\.\."/,
  `<button type="button" onClick={() => alert('Media upload requires Cloud Storage integration. Text only supported for now.')} className="text-slate-400 hover:text-slate-600 p-2">
    <Paperclip className="w-5 h-5" />
  </button>
  <input
    type="text"
    placeholder="Type a message..."`
);

fs.writeFileSync('src/components/WhatsAppWidget.tsx', code);
