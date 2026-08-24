"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, GraduationCap, User, Bell, Search, Menu, LogOut, Moon, Sun, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Bot, Star } from "lucide-react";
import NotificationBell from "@/components/student/NotificationBell";
import { createClient } from '@/utils/supabase/client';
import { useTheme } from "next-themes";
import ChatbotWidget from "@/components/student/ChatbotWidget";

function GeminiRobotAssistantIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Speech Bubble Frame */}
      <path 
        d="M 60 10 C 33.5 10 12 31.5 12 58 C 12 69.8 16.3 80.6 23.5 89 C 18 97 12 103 8 106 C 20 106 31 100.5 38.5 94.5 C 45 97.4 52.3 99 60 99 C 86.5 99 108 77.5 108 58 C 108 31.5 86.5 10 60 10 Z" 
        fill="white"
        stroke="#1E293B"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      
      {/* Headset Top Band */}
      <path 
        d="M 32 50 C 32 30 44 20 60 20 C 76 20 88 30 88 50" 
        stroke="#1E293B" 
        strokeWidth="6" 
        strokeLinecap="round"
      />
      <path 
        d="M 36 50 C 36 34 46 25 60 25 C 74 25 84 34 84 50" 
        stroke="#2563EB" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      
      {/* Antennas */}
      <line x1="38" y1="24" x2="33" y2="16" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="14" r="4.5" fill="#3B82F6" stroke="#1E293B" strokeWidth="3" />
      
      <line x1="82" y1="24" x2="87" y2="16" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
      <circle cx="88" cy="14" r="4.5" fill="#3B82F6" stroke="#1E293B" strokeWidth="3" />

      {/* Robot Head Base */}
      <rect x="30" y="32" width="60" height="46" rx="20" fill="white" stroke="#1E293B" strokeWidth="5" />
      
      {/* Robot Visor Screen */}
      <rect x="36" y="41" width="48" height="24" rx="12" fill="#0F172A" stroke="#1E293B" strokeWidth="3" />
      
      {/* Glass Reflective Sheen on Visor */}
      <path d="M 40 43 L 68 43 L 54 63 L 40 63 Z" fill="white" opacity="0.15" />
      
      {/* Glowing Cyan-Blue Eyes */}
      <circle cx="47" cy="53" r="5" fill="none" stroke="#38BDF8" strokeWidth="3" />
      <circle cx="47" cy="53" r="2" fill="#38BDF8" />
      
      <circle cx="73" cy="53" r="5" fill="none" stroke="#38BDF8" strokeWidth="3" />
      <circle cx="73" cy="53" r="2" fill="#38BDF8" />
      
      {/* Smile */}
      <path d="M 54 57 C 56 61 64 61 66 57 Z" fill="white" stroke="#1E293B" strokeWidth="2" />
      
      {/* Headphones Side Cups */}
      <rect x="23" y="41" width="10" height="26" rx="5" fill="#2563EB" stroke="#1E293B" strokeWidth="4" />
      <rect x="26" y="45" width="4" height="18" rx="2" fill="#60A5FA" />

      <rect x="87" y="41" width="10" height="26" rx="5" fill="#2563EB" stroke="#1E293B" strokeWidth="4" />
      <rect x="90" y="45" width="4" height="18" rx="2" fill="#60A5FA" />

      {/* Mic Stem & Tip */}
      <path d="M 28 62 Q 28 75 45 75" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="46" cy="75" r="4.5" fill="#1E293B" />

      {/* Body Shoulders */}
      <path d="M 42 78 C 42 72 48 70 60 70 C 72 70 78 72 78 78 L 78 86 L 42 86 Z" fill="white" stroke="#1E293B" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState<{id: string, full_name: string, avatar_url: string} | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcementsCount, setAnnouncementsCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadNotifications = async (userId: string) => {
    const { getChatMessages } = await import('@/utils/supabase/queries');
    const msgs = await getChatMessages(userId);
    const adminMsgs = msgs.filter((m: any) => m.sender_role === 'admin').reverse();
    setNotifications(adminMsgs);
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
        await loadNotifications(user.id);
      }
    };
    fetchProfileData();

    // Set up realtime listener for messages (or whatever is left)
    const supabase = createClient();
    const handleAdminMessage = () => {
      // Logic for new admin message can go here if needed
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Handle scroll for Topbar blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "ภาพรวมการเรียน", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "บทเรียนทั้งหมด", href: "/student/courses", icon: BookOpen },
    { name: "กล่องข้อความ", href: "/student/messages", icon: MessageSquare },
    { name: "ใบรับรอง", href: "/student/certificates", icon: GraduationCap },
    { name: "ประเมินความพึงพอใจ", href: "/student/evaluation", icon: Star },
    { name: "Gemini AI", href: "https://gemini.google.com/gem/15dbYiItlbBm0ftGwv7afznqbZbTypamH?usp=sharing", icon: Bot, external: true },
    { name: "โปรไฟล์", href: "/student/profile", icon: User },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Desktop Sidebar (Left) */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-full ${isSidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 vision-glass-panel border-l-0 border-y-0 rounded-none z-40 p-4 print:hidden`}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          className={`absolute top-2 ${isSidebarCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-4'} text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-50`}
          title={isSidebarCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Logo and Title */}
        <div className={`flex items-center gap-3 mb-10 ${isSidebarCollapsed ? 'justify-center mt-14' : 'mt-1'}`}>
          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          {!isSidebarCollapsed && (
            <span className="font-extrabold text-base tracking-tight whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">DBASE Learning AI</span>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith('/student/learn') && item.href === '/student/courses');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white/10"
                }`}
                title={isSidebarCollapsed ? item.name : undefined}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className={`w-5 h-5 ${isActive ? "opacity-100" : "opacity-70"}`} strokeWidth={1.5} />
                  {item.name === "กล่องข้อความ" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-50 dark:border-slate-900"></span>
                  )}
                </div>
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-200/20 dark:border-slate-700/20 space-y-2">
          <button onClick={handleLogout} className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3 w-full rounded-2xl text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300`} title={isSidebarCollapsed ? "ออกจากระบบ" : undefined}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isSidebarCollapsed && <span>ออกจากระบบ</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} flex flex-col min-h-screen transition-all duration-300 print:ml-0 print:md:ml-0`}>
        
        {/* Topbar (Search & Profile) */}
        <header className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 transition-all duration-300 ${scrolled ? 'vision-glass-panel border-x-0 border-t-0 rounded-none' : 'bg-transparent'} print:hidden`}>
          <div className="flex items-center gap-4 md:hidden">
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">DBASE Learning AI</span>
          </div>

          <div className="hidden md:flex items-center max-w-md w-full relative">
            <Search className="w-5 h-5 absolute left-4 text-blue-500 z-10" />
            <input 
              type="text" 
              placeholder="ค้นหาคอร์สเรียน, บทเรียน..." 
              className="w-full bg-white dark:bg-slate-800 backdrop-blur-md border border-blue-400 dark:border-blue-500/50 shadow-sm rounded-full py-2.5 pl-12 pr-4 text-slate-700 dark:text-slate-200 focus:outline-none ring-2 ring-blue-500/20 dark:ring-blue-500/40 transition-all placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {mounted && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="relative p-2.5 rounded-full bg-white/20 dark:bg-slate-800/20 backdrop-blur-md border border-white/30 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-700/50 transition-colors"
                title="Toggle Dark Mode"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            <div className="flex items-center gap-2 relative">
              <NotificationBell />
            </div>
            
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400 p-0.5 shadow-md flex-shrink-0 cursor-pointer" title={profile?.full_name || 'Profile'}>
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-8 pb-40 md:p-8 mt-2 md:mt-4">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 print:hidden transition-transform duration-300" id="student-bottom-nav">
        <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex items-center justify-around pt-3 pb-8 px-2 border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          {navItems
            .filter(item => item.name !== "Gemini AI") // Hide Gemini on mobile bottom nav
            .map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith('/student/learn') && item.href === '/student/courses');
              
              // Shorten names for mobile
              let shortName = item.name;
              if (item.name === "ภาพรวมการเรียน") shortName = "ภาพรวม";
              if (item.name === "บทเรียนทั้งหมด") shortName = "บทเรียน";
              if (item.name === "กล่องข้อความ") shortName = "ข้อความ";

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-300 relative w-[60px] ${
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                >
                  <div className={`relative flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-blue-100 dark:bg-blue-900/40 scale-110' : 'bg-transparent'}`}>
                    <item.icon className={`w-5 h-5 ${isActive ? "opacity-100" : "opacity-80"}`} strokeWidth={isActive ? 2 : 1.5} />
                    {item.name === "กล่องข้อความ" && unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    )}
                  </div>
                  <span className={`text-[10px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>{shortName}</span>
                </Link>
              );
          })}
        </nav>
      </div>

      {/* AI Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
}
