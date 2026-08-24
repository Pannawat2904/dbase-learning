"use client";

import { useState, useEffect, useRef } from "react";
import { getChatMessages, sendChatMessage, markChatAsRead } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/client";
import { Send, CheckCheck, Loader2, MessageSquare } from "lucide-react";

export default function StudentMessagesPage() {
  const [profile, setProfile] = useState<{id: string, full_name: string, avatar_url: string} | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: any;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
          await loadMessages(data.id);

          // Setup Realtime Subscription
          channel = supabase.channel('student_chat_channel')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `student_id=eq.${data.id}`
              },
              (payload) => {
                setMessages((prev) => [...prev, payload.new]);
                scrollToBottom();
                if (payload.new.sender_role === 'admin') {
                  markChatAsRead(data.id, 'admin');
                }
              }
            )
            .subscribe();
        }
      }
    };
    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const loadMessages = async (userId: string) => {
    setIsLoading(true);
    const data = await getChatMessages(userId);
    setMessages(data);
    await markChatAsRead(userId, 'admin'); // Mark messages from admin as read
    setIsLoading(false);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    setIsSending(true);
    const success = await sendChatMessage(profile.id, 'student', newMessage.trim());
    if (success) {
      setNewMessage("");
      const data = await getChatMessages(profile.id);
      setMessages(data);
      scrollToBottom();
    }
    setIsSending(false);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="vision-glass flex flex-col h-full rounded-2xl overflow-hidden shadow-xl border border-white/20 dark:border-slate-800/50">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">คุยกับคุณครู (Admin)</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/20">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-slate-500 dark:text-slate-400">ยังไม่มีข้อความ เริ่มต้นการสนทนาได้เลย!</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex ${msg.sender_role === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ${
                  msg.sender_role === 'student' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-blue-500/20' 
                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                }`}>
                  <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  <div className={`text-[10px] mt-2 flex items-center gap-1 justify-end ${msg.sender_role === 'student' ? 'text-blue-100' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                    {msg.sender_role === 'student' && (
                      <CheckCheck className={`w-3.5 h-3.5 ${msg.is_read ? 'text-blue-200' : 'opacity-50'}`} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 sm:p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50">
          <form onSubmit={handleSendMessage} className="flex gap-3 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="พิมพ์ข้อความที่นี่..."
              className="flex-1 px-5 py-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-700 dark:text-slate-200 shadow-sm transition-all text-sm md:text-base"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95"
            >
              {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 ml-1" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
