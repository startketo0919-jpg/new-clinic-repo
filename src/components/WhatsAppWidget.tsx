import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Paperclip } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function WhatsAppWidget() {
  const { state, sendWhatsAppMessage } = useClinic();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatPhone, setActiveChatPhone] = useState<string | null>(null);
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

  
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = (state.messages || []).filter(m => m.phone !== 'SYSTEM');

  // When opening a chat, mark as read
  useEffect(() => {
    if (activeChatPhone) markAsRead(activeChatPhone);
  }, [activeChatPhone, messages]);

  
  // Group messages by phone
  const chats = messages.reduce((acc, msg) => {
    if (!acc[msg.phone]) {
      acc[msg.phone] = { phone: msg.phone, messages: [], lastMsgTime: 0 };
    }
    acc[msg.phone].messages.push(msg);
    if (msg.timestamp > acc[msg.phone].lastMsgTime) {
      acc[msg.phone].lastMsgTime = msg.timestamp;
    }
    return acc;
  }, {} as Record<string, { phone: string, messages: any[], lastMsgTime: number }>);
  
  const chatList = (Object.values(chats) as { phone: string, messages: any[], lastMsgTime: number }[]).sort((a, b) => b.lastMsgTime - a.lastMsgTime);
  
  const getUnreadCount = (chat: any) => {
    const lastRead = readMap[chat.phone] || 0;
    return chat.messages.filter((m: any) => m.direction === 'inbound' && m.timestamp > lastRead).length;
  };
  
  const totalUnread = chatList.reduce((sum, chat) => sum + getUnreadCount(chat), 0);

  const activeChat = activeChatPhone ? chats[activeChatPhone] : null;

  useEffect(() => {
    if (isOpen && activeChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeChat]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatPhone) return;
    sendWhatsAppMessage(activeChatPhone, inputText.trim());
    setInputText('');
  };

  const getPatientName = (phone: string) => {
    const normalizedSearch = phone.startsWith('91') && phone.length === 12 ? phone.substring(2) : phone;
    const p = state.patientRegistry.find(r => r.phone === phone || r.phone === normalizedSearch);
    return p ? p.fullName : phone;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[380px] h-[600px] max-h-[80vh] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-10 fade-in">
          {/* Header */}
          <div className="bg-[#075E54] text-white p-4 flex justify-between items-center shadow-md z-10">
            {activeChatPhone ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveChatPhone(null)}
                  className="hover:bg-white/20 p-1 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 rotate-45 transform" style={{ transform: 'rotate(0)' }} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
    <span className="font-semibold leading-tight">{getPatientName(activeChatPhone)}</span>
    <span className="text-[10px] text-teal-100">{activeChatPhone}</span>
  </div>
</div>
              </div>
            ) : (
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                WhatsApp Messages
              </h3>
            )}
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 bg-[#EFEAE2] flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.06] bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-repeat" style={{ backgroundSize: '400px' }} />
            
            {activeChatPhone && activeChat ? (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative z-10">
                {activeChat.messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "max-w-[85%] rounded-lg p-2.5 shadow-sm text-sm relative",
                      msg.status === 'failed' ? 'border-2 border-red-500' : '',
                      msg.direction === 'outbound' 
                        ? "bg-[#DCF8C6] self-end rounded-tr-none" 
                        : "bg-white self-start rounded-tl-none"
                    )}
                  >
                    <div className="break-words text-slate-800 whitespace-pre-wrap">{msg.content}</div>
                    <div className="text-[10px] text-slate-500 text-right mt-1.5">
                      {format(new Date(msg.timestamp), 'h:mm a')}
                      {msg.status === 'failed' && <span className="text-red-500 ml-2 font-bold">Failed to send (outside 24h window or invalid)</span>}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-white relative z-10">
                {chatList.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm p-6 text-center">
                    No messages yet. When patients reply to your templates, they will appear here.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {chatList.map(chat => (
                      <button
                        key={chat.phone}
                        onClick={() => setActiveChatPhone(chat.phone)}
                        className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center gap-4"
                      >
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-slate-800 truncate">{getPatientName(chat.phone)}</span>
                            <span className="text-xs text-slate-500 flex-shrink-0">
                              {format(new Date(chat.lastMsgTime), 'MMM d')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 truncate">
                            {chat.messages[chat.messages.length - 1].content}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Input */}
          {activeChatPhone && (
            <div className="bg-[#f0f0f0] p-3 border-t border-slate-200 z-10">
              <form onSubmit={handleSend} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message"
                  className="flex-1 bg-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#075E54] border-none shadow-sm"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-[#075E54] text-white p-2 rounded-full hover:bg-[#128C7E] disabled:opacity-50 disabled:hover:bg-[#075E54] transition-colors shadow-sm"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center relative"
      >
        {isOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
        {!isOpen && messages.filter(m => m.direction === 'inbound' && m.status === 'received').length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
            !
          </span>
        )}
      </button>
    </div>
  );
}
