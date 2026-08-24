import { Users, Plus, ShieldCheck, Trash2, CheckCircle2 } from "lucide-react";
import { getAdminUsers, getCurrentTeacher } from "@/utils/supabase/queries";
import AddTeacherButton from "@/components/admin/AddTeacherButton";
import DeleteTeacherButton from "@/components/admin/DeleteTeacherButton";

export default async function AdminTeachersPage() {
  const teachers = await getAdminUsers();
  const currentTeacher = await getCurrentTeacher();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">จัดการครูผู้สอน (Teachers)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">เพิ่มและจัดการบัญชีผู้ดูแลระบบ / ครูผู้สอน</p>
        </div>
        <AddTeacherButton />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                <th className="px-6 py-4">Username (ล็อกอิน)</th>
                <th className="px-6 py-4">บทบาท</th>
                <th className="px-6 py-4">วันที่เพิ่ม</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {/* Main Admin (Fallback representation) */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      A
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">Admin (ผู้ดูแลระบบ)</p>
                      <p className="text-xs text-slate-500">ผู้ดูแลระบบหลัก</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">admin</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin (Super)
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-500">-</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-xs text-slate-400">บัญชีหลัก ไม่สามารถลบได้</span>
                </td>
              </tr>

              {/* DB Teachers */}
              {teachers.map((teacher: any) => {
                const isCurrent = currentTeacher?.id === teacher.id;
                return (
                  <tr key={teacher.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isCurrent ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          {teacher.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={teacher.avatar_url} alt={teacher.name} className="w-full h-full object-cover" />
                          ) : (
                            teacher.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800 dark:text-white">{teacher.name}</p>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                <CheckCircle2 className="w-3 h-3" /> คุณ (กำลังใช้งาน)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 font-mono">{teacher.username}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Users className="w-3.5 h-3.5" />
                        Teacher
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">
                        {new Date(teacher.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isCurrent ? (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">บัญชีของคุณ</span>
                      ) : (
                        <DeleteTeacherButton id={teacher.id} name={teacher.name} />
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    ยังไม่มีครูผู้สอนท่านอื่นในระบบ
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
