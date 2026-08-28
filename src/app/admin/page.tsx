import { Users, BookOpen, Clock, Activity, ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { getDashboardStats, getCurrentTeacher } from "@/utils/supabase/queries";
import AutoRefresh from "@/components/admin/AutoRefresh";

import ItemAnalysisReport from "@/components/admin/ItemAnalysisReport";
import AtRiskStudents from "@/components/admin/AtRiskStudents";
import AnnouncementManager from "@/components/admin/AnnouncementManager";

export default async function AdminDashboard() {
  const [dbStats, currentTeacher] = await Promise.all([
    getDashboardStats(),
    getCurrentTeacher(),
  ]);

  const stats = [
    { name: "นักเรียนทั้งหมด", value: dbStats.totalStudents.toString(), change: "0", icon: Users, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", href: "/admin/students" },
    { name: "คอร์สเรียนเปิดสอน", value: dbStats.totalCourses.toString(), change: "0", icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", href: "/admin/courses" },
    { name: "เวลาเรียนเฉลี่ย", value: dbStats.avgStudyTime, change: "0", icon: Clock, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", href: "/admin/students" },
    { name: "การใช้งานวันนี้", value: dbStats.todayActive.toString(), change: "0", icon: Activity, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", href: "/admin/students" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <AutoRefresh interval={5000} />
      
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ภาพรวมระบบ</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          ยินดีต้อนรับกลับมาครับ <span className="font-semibold text-blue-600 dark:text-blue-400">{currentTeacher?.name ? currentTeacher.name : 'คุณครู'}</span> นี่คือสถานะล่าสุดของระบบเรียนของคุณ
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <Link href={stat.href} key={i}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:-translate-y-1 h-full cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.change !== "0" && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20' : 'text-red-700 bg-red-50'}`}>
                    {stat.change}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{stat.value}</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Analysis & At-Risk Students (2 columns width) */}
        <div className="lg:col-span-2 space-y-6">
          <ItemAnalysisReport />
          <AtRiskStudents />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">จัดการด่วน</h2>
          <div className="space-y-3">
            <Link href="/admin/courses" className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors group border border-transparent hover:border-blue-100 dark:hover:border-blue-800/30">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-slate-700 dark:text-slate-200">สร้างบทเรียนใหม่</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
            <Link href="/admin/students" className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/30">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-slate-700 dark:text-slate-200">ดูคะแนนนักเรียน</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnnouncementManager />
      </div>

    </div>
  );
}
