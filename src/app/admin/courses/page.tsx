import Link from "next/link";
import { MoreVertical, Edit, BookOpen, Users } from "lucide-react";
import { getCourses } from "@/utils/supabase/queries";
import CreateCourseButton from "@/components/admin/CreateCourseButton";
import AutoRefresh from "@/components/admin/AutoRefresh";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminCoursesPage() {
  const courses = await getCourses();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <AutoRefresh interval={5000} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">จัดการบทเรียน (Lessons)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">จัดการบทเรียนและเนื้อหาการสอนทั้งหมด</p>
        </div>
        <CreateCourseButton />
      </div>

      {/* Courses List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">ชื่อบทเรียน</th>
                <th className="px-6 py-4">รหัสวิชา</th>
                <th className="px-6 py-4">ผู้เรียน</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {courses.map((course: any) => (
                <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{course.title}</p>
                        <p className="text-xs text-slate-500">{course.totalLessons || 0} บทเรียน</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {course.code || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{course.studentCount || 0} คน</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      course.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    }`}>
                      {course.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/admin/courses/${course.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      จัดการเนื้อหา
                    </Link>
                  </td>
                </tr>
              ))}
              
              {courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    ยังไม่มีบทเรียน กรุณาสร้างบทเรียนใหม่
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
