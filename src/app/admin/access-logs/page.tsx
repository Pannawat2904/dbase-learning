import { History, Shield, Users, LogIn, LogOut, Search, Filter, Clock, Laptop, Smartphone, Globe } from "lucide-react";
import { getAccessLogs } from "@/utils/audit-logger";
import AutoRefresh from "@/components/admin/AutoRefresh";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminAccessLogsPage() {
  const logs = await getAccessLogs(250);

  // Statistics
  const totalEvents = logs.length;
  const todayDate = new Date().toISOString().split('T')[0];
  const loginsToday = logs.filter(l => l.event === 'login' && l.rawTimestamp?.startsWith(todayDate)).length;
  const uniqueUsers = new Set(logs.map(l => l.email).filter(e => e !== '-')).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <AutoRefresh interval={5000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <History className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            ประวัติการเข้าใช้งาน (Access Logs)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            ตรวจสอบบันทึกการเข้าสู่ระบบ (Login) และออกจากระบบ (Logout) ของผู้ใช้งานทั้งหมดแบบ Real-time
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
              <History className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">{totalEvents}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">รายการ Log ทั้งหมดที่บันทึก</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <LogIn className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              วันนี้
            </span>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">{loginsToday}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">การเข้าสู่ระบบในวันนี้</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">{uniqueUsers}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">ผู้ใช้งานไม่ซ้ำ (Unique Users)</p>
        </div>
      </div>

      {/* Access Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            บันทึกการเข้า-ออกระบบล่าสุด (Latest Activity)
          </h2>
          <span className="text-xs text-slate-400">
            อัปเดตอัตโนมัติทุก 5 วินาที
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">เหตุการณ์</th>
                <th className="px-6 py-4">ผู้ใช้งาน</th>
                <th className="px-6 py-4">บทบาท</th>
                <th className="px-6 py-4">วันที่ - เวลา (ไทย)</th>
                <th className="px-6 py-4">อุปกรณ์ / เบราว์เซอร์</th>
                <th className="px-6 py-4">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {logs.map((log) => {
                const isLogin = log.event === 'login';
                const isStudent = log.role === 'student';
                const isTeacher = log.role === 'teacher';

                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Event Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isLogin 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {isLogin ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                        {isLogin ? 'เข้าสู่ระบบ (Login)' : 'ออกจากระบบ (Logout)'}
                      </span>
                    </td>

                    {/* User info */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{log.userName}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{log.email}</p>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isStudent 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                          : isTeacher 
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}>
                        {isStudent ? 'นักเรียน' : isTeacher ? 'ครูผู้สอน' : 'ผู้ดูแลระบบ'}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {log.timestamp}
                      </div>
                    </td>

                    {/* User Agent / Device */}
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-[220px] truncate" title={log.userAgent}>
                      <div className="flex items-center gap-1.5 truncate">
                        <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{log.userAgent && log.userAgent !== '-' ? log.userAgent : 'Web Browser'}</span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {log.details}
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    ยังไม่มีประวัติการเข้าใช้งานในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
