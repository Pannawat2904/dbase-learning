"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Database,
  MessageSquare,
  Bot,
  UserCog
} from "lucide-react";
import { useState, useEffect } from "react";
import { logoutTeacher } from "./login/actions";

function getCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const raw = parts.pop()?.split(';').shift();
    return raw ? decodeURIComponent(raw) : undefined;
  }
  return undefined;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('ผู้สอน');
  const [teacherAvatar, setTeacherAvatar] = useState<string | undefined>(undefined);

  useEffect(() => {
    // 1. Initial immediate state from decoded cookies
    const cookieName = getCookie('teacher_name');
    const cookieAvatar = getCookie('teacher_avatar');
    if (cookieName) setTeacherName(cookieName);
    if (cookieAvatar) setTeacherAvatar(cookieAvatar);

    // 2. Fetch fresh teacher info from server / DB
    fetch('/api/admin/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        if (data?.authenticated && data?.teacher) {
          if (data.teacher.name) setTeacherName(data.teacher.name);
          setTeacherAvatar(data.teacher.avatar_url || undefined);
        }
      })
      .catch((err) => {
        console.warn('Teacher session check:', err.message);
      });
  }, [pathname]);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear all client cookies
    document.cookie = 'teacher_auth=; Max-Age=0; path=/;';
    document.cookie = 'teacher_id=; Max-Age=0; path=/;';
    document.cookie = 'teacher_name=; Max-Age=0; path=/;';
    document.cookie = 'teacher_username=; Max-Age=0; path=/;';
    document.cookie = 'teacher_avatar=; Max-Age=0; path=/;';
    await logoutTeacher();
  };

  const navItems = [
    { name: "หน้าหลัก", href: "/admin", icon: LayoutDashboard },
    { name: "จัดการบทเรียน", href: "/admin/courses", icon: BookOpen },
    { name: "จัดการนักเรียน", href: "/admin/students", icon: Users },
    { name: "จัดการครูผู้สอน", href: "/admin/teachers", icon: UserCog, hideForTeacher: true },
    { name: "ตรวจงานและข้อสอบ", href: "/admin/grading", icon: BookOpen },
    { name: "กล่องข้อความ", href: "/admin/inbox", icon: MessageSquare },
    { name: "ประวัติคุยกับ AI", href: "/admin/ai-logs", icon: Bot },
    { name: "ตั้งค่าระบบ", href: "/admin/settings", icon: Settings },
  ];

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 dark:text-white">ระบบจัดการผู้สอน</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 dark:text-slate-300">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          
          {/* Logo Area */}
          <div className="p-6 hidden md:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">DBASE AI</h1>
              <p className="text-xs text-slate-500 font-medium">สำหรับครูผู้สอน</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 md:py-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Logout */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <form onSubmit={handleLogout} action={logoutTeacher}>
              <button type="submit" className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">ออกจากระบบ</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0">
        {/* Topbar (optional) */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">
              {pathname === '/admin' ? 'หน้าหลัก' : 
               pathname.includes('/courses/') ? 'จัดการเนื้อหาบทเรียน' : 
               pathname.includes('/courses') ? 'จัดการบทเรียน' : 
               pathname.includes('/students') ? 'จัดการนักเรียน' : 
               pathname.includes('/students') ? 'จัดการนักเรียน' :
               pathname.includes('/grading') ? 'ตรวจงานและข้อสอบ' : 
               pathname.includes('/inbox') ? 'กล่องข้อความ' : 
               pathname.includes('/settings') ? 'ตั้งค่าระบบ' : 
               'ระบบจัดการผู้สอน'}
            </h2>
            <div className="hidden sm:flex px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/50">
              สถานะ: ผู้สอน
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 pl-4 pr-1.5 rounded-full shadow-sm">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
                {teacherName}
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-600">
                {teacherAvatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={teacherAvatar} alt={teacherName} className="w-full h-full object-cover" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=0D8ABC&color=fff`} alt={teacherName} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 pt-6 pb-24 sm:p-6 sm:pt-8 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
