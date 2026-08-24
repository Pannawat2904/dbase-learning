"use client";

import { useState, useEffect } from "react";
import { getInboxSummaries, getChatMessages, sendChatMessage, markChatAsRead } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/client";
import { Send, User, CheckCheck, Loader2, MessageSquare, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function AdminInboxPage() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadSummaries();

    // Setup Realtime Subscription for Admin Inbox
    const supabase = createClient();
    const channel = supabase.channel('admin_inbox_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          // If the message is for the currently open chat, update the chat
          setMessages((prev) => {
            // We use state functional update to ensure we have latest selectedStudentId
            // but we can't easily access selectedStudentId inside here without refs.
            // A simple trick is to just loadMessages if payload matches, but we can't do async inside setMessages.
            return prev;
          });
          
          // Refresh summaries anyway to show latest messages
          loadSummaries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Use a separate effect to append realtime messages to the active chat
  useEffect(() => {
    if (!selectedStudentId) return;

    const supabase = createClient();
    const channel = supabase.channel(`admin_chat_${selectedStudentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `student_id=eq.${selectedStudentId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          if (payload.new.sender_role === 'student') {
            markChatAsRead(selectedStudentId, 'student');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudentId]);

  const loadSummaries = async () => {
    setIsLoading(true);
    const data = await getInboxSummaries();
    setSummaries(data);
    setIsLoading(false);
  };

  const loadMessages = async (studentId: string) => {
    setSelectedStudentId(studentId);
    const data = await getChatMessages(studentId);
    setMessages(data);
    
    // Mark messages from student as read
    await markChatAsRead(studentId, 'student');
    
    // Update local summary unread count
    setSummaries(prev => prev.map(s => 
      s.student.id === studentId ? { ...s, unreadCount: 0 } : s
    ));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedStudentId) return;

    setIsSending(true);
    const success = await sendChatMessage(selectedStudentId, 'admin', newMessage.trim());
    if (success) {
      setNewMessage("");
      await loadMessages(selectedStudentId);
      await loadSummaries(); // Refresh latest message
    } else {
      toast.error("ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
    setIsSending(false);
  };

  const selectedStudent = summaries.find(s => s.student.id === selectedStudentId)?.student;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden h-[calc(100vh-8rem)]">
      <div className="flex h-full">
        
        {/* Inbox List (Left Sidebar) */}
        <div className={`${selectedStudentId ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 flex-col h-full bg-slate-50/50 dark:bg-slate-900/50`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-bold text-slate-800 dark:text-white">กล่องข้อความ</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : summaries.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                ไม่มีข้อความ
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {summaries.map((summary) => (
                  <button
                    key={summary.student.id}
                    onClick={() => loadMessages(summary.student.id)}
                    className={`w-full text-left p-4 transition-colors hover:bg-white dark:hover:bg-slate-800 ${
                      selectedStudentId === summary.student.id 
                        ? 'bg-white dark:bg-slate-800 border-l-4 border-l-blue-500' 
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img src={summary.student.avatar_url} alt={summary.student.full_name} className="w-10 h-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className={`text-sm font-semibold truncate ${summary.unreadCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {summary.student.full_name}
                          </h4>
                          {summary.latestMessageTime && (
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              {new Date(summary.latestMessageTime).toLocaleDateString('th-TH')}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${summary.unreadCount > 0 ? 'font-medium text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>
                          {summary.latestMessage}
                        </p>
                      </div>
                      {summary.unreadCount > 0 && (
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-[10px] font-bold text-white">{summary.unreadCount}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area (Right Side) */}
        <div className={`${selectedStudentId ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full bg-slate-50/30 dark:bg-slate-900/30 relative w-full md:w-auto`}>
          {selectedStudentId ? (
            <>
              {/* Chat Header */}
              <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                <button 
                  onClick={() => setSelectedStudentId(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <img src={selectedStudent?.avatar_url} alt="Profile" className="w-10 h-10 rounded-full" />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">{selectedStudent?.full_name}</h3>
                  <p className="text-xs text-slate-500">{selectedStudent?.email}</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                      msg.sender_role === 'admin' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className={`text-[10px] mt-1 flex items-center gap-1 justify-end ${msg.sender_role === 'admin' ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                        {msg.sender_role === 'admin' && (
                          <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-blue-200' : 'opacity-50'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="พิมพ์ข้อความตอบกลับ..."
                    className="flex-1 px-4 py-3 rounded-full bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p>เลือกนักเรียนจากเมนูด้านซ้ายเพื่ออ่านหรือส่งข้อความ</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
