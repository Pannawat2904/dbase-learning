"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Megaphone, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  isChat?: boolean;
}

export default function NotificationBell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    
    // Load read state from local storage
    const storedReadIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    setReadIds(new Set(storedReadIds));

    const fetchAnnouncements = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
        
      let allAnnouncements = data ? [...data] : [];
      
      // Fetch automated grade notifications from chat
      if (user) {
        const { data: chatData } = await supabase
          .from("chat_messages")
          .select("id, message, created_at")
          .eq("receiver_id", user.id)
          .eq("sender_id", "admin")
          .like("message", "แจ้งเตือนอัตโนมัติ%")
          .order("created_at", { ascending: false })
          .limit(10);
          
        if (chatData) {
          const chatNotifications = chatData.map(msg => ({
            id: `chat-${msg.id}`,
            title: "แจ้งเตือนผลการตรวจงาน",
            content: msg.message.replace("แจ้งเตือนอัตโนมัติ: ", ""),
            created_at: msg.created_at,
            isChat: true
          }));
          allAnnouncements = [...allAnnouncements, ...chatNotifications];
          // Sort combined array by date
          allAnnouncements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      }
        
      if (!error) {
        setAnnouncements(allAnnouncements.slice(0, 15));
      }
    };

    fetchAnnouncements();

    // Subscribe to realtime changes for announcements
    const channel = supabase
      .channel('public:announcements')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const newAnnouncement = payload.new as Announcement;
          setAnnouncements(prev => {
            const exists = prev.find(a => a.id === newAnnouncement.id);
            if (exists) return prev;
            return [newAnnouncement, ...prev].slice(0, 15);
          });
        }
      )
      .subscribe();
      
    // Subscribe to chat notifications for grades
    let chatChannel: any = null;
    const setupChatSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        chatChannel = supabase
          .channel('public:chat_messages:notifications')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${user.id}` },
            (payload) => {
              const msg = payload.new;
              if (msg.sender_id === 'admin' && msg.message.startsWith('แจ้งเตือนอัตโนมัติ')) {
                const newNotification = {
                  id: `chat-${msg.id}`,
                  title: "แจ้งเตือนผลการตรวจงาน",
                  content: msg.message.replace("แจ้งเตือนอัตโนมัติ: ", ""),
                  created_at: msg.created_at,
                  isChat: true
                };
                setAnnouncements(prev => {
                  const exists = prev.find(a => a.id === newNotification.id);
                  if (exists) return prev;
                  return [newNotification as any, ...prev].slice(0, 15);
                });
              }
            }
          )
          .subscribe();
      }
    };
    setupChatSubscription();

    return () => {
      supabase.removeChannel(channel);
      if (chatChannel) supabase.removeChannel(chatChannel);
    };
  }, []);

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;

  const markAllAsRead = () => {
    const newReadIds = new Set(announcements.map(a => a.id));
    setReadIds(newReadIds);
    localStorage.setItem('readAnnouncements', JSON.stringify(Array.from(newReadIds)));
  };

  const handleToggle = () => {
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
    setIsOpen(!isOpen);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins || 1} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    return `${diffDays} วันที่แล้ว`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleToggle}
        className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
        aria-label="แจ้งเตือน"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-full w-full bg-red-500 border border-white dark:border-slate-900"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute -right-12 sm:right-0 mt-2 w-[320px] sm:w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">การแจ้งเตือน</h3>
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
              {announcements.length} รายการ
            </span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">ยังไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4 relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${announcement.isChat ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                      {announcement.isChat ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                          {announcement.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDate(announcement.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
