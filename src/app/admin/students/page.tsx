import { Search, Filter, CheckCircle2, XCircle, Users } from "lucide-react";
import { getStudents, getAllStudentScores, getAllStudentProgress, getCourses, getAllStudentAssignments } from "@/utils/supabase/queries";
import StudentActionsMenu from "@/components/admin/StudentActionsMenu";
import AutoRefresh from "@/components/admin/AutoRefresh";
import ExportExcelButton from "@/components/admin/ExportExcelButton";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminStudentsPage() {
  const dbStudents = await getStudents();
  const allScores = await getAllStudentScores();
  const allProgress = await getAllStudentProgress();
  const allAssignments = await getAllStudentAssignments();
  const courses = await getCourses();
  
  // Calculate total lessons across all courses
  const totalLessons = courses.reduce((sum, c) => sum + (c.totalLessons || 0), 0) || 1;
  
  // Format real students
  const students = dbStudents?.map((student: any) => {
    const studentScores = allScores?.filter((s: any) => s.student_id === student.id) || [];
    const preTestScore = studentScores.find((s: any) => s.exam_type === 'pre-test');
    const postTestScore = studentScores.find((s: any) => s.exam_type === 'post-test');
    
    // Calculate Quiz and Assignment scores
    const quizScores = studentScores.filter((s: any) => s.exam_type === 'quiz' && s.status === 'graded');
    const totalQuizScore = quizScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
    const totalQuizMax = quizScores.reduce((sum: number, s: any) => sum + (s.total_score || 0), 0);
    const quizText = quizScores.length > 0 ? `${totalQuizScore}/${totalQuizMax}` : "-";

    const studentAssignmentsList = allAssignments.filter((a: any) => a.student_id === student.id && a.score !== null);
    const totalAssignmentScore = studentAssignmentsList.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
    const assignmentText = studentAssignmentsList.length > 0 ? `${totalAssignmentScore}` : "-";
    
    // Calculate progress based on unique lesson interactions
    const studentCompletedLessonsSet = new Set([
      ...allProgress.filter((p: any) => p.student_id === student.id).map((p: any) => p.lesson_id),
      ...studentScores.map((s: any) => s.lesson_id),
      ...allAssignments.filter((a: any) => a.student_id === student.id).map((a: any) => a.lesson_id)
    ].filter(Boolean)); // filter out null/undefined
    
    const progress = Math.round((studentCompletedLessonsSet.size / totalLessons) * 100);
    
    // Calculate last active
    let lastActive = "ยังไม่เคยเข้าเรียน";
    const allActivityDates = [
      ...studentScores.map((s: any) => new Date(s.created_at).getTime()),
      ...allProgress.filter((p: any) => p.student_id === student.id).map((p: any) => new Date(p.created_at).getTime()),
      ...allAssignments.filter((a: any) => a.student_id === student.id).map((a: any) => new Date(a.created_at).getTime())
    ].filter(Boolean);
    
    if (allActivityDates.length > 0) {
      const maxDate = new Date(Math.max(...allActivityDates));
      lastActive = maxDate.toLocaleDateString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
    }
    
    return {
      id: student.id,
      name: student.full_name || "ไม่ระบุชื่อ",
      email: student.email,
      progress: Math.min(100, progress),
      lastActive,
      status: "Active",
      preTest: preTestScore ? `${preTestScore.score}/${preTestScore.total_score}` : "-",
      preTestId: preTestScore?.lesson_id,
      postTest: postTestScore ? `${postTestScore.score}/${postTestScore.total_score}` : "-",
      postTestId: postTestScore?.lesson_id,
      postTestPassed: postTestScore ? (postTestScore.score / postTestScore.total_score >= 0.6) : false,
      quiz: quizText,
      assignment: assignmentText,
      avatar_url: student.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name || 'U')}&background=random`
    };
  }) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <AutoRefresh interval={15000} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">จัดการนักเรียน</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">ติดตามความก้าวหน้าและผลคะแนนของผู้เรียน</p>
        </div>
        <ExportExcelButton students={students} />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="ค้นหาชื่อ, รหัส หรืออีเมลนักเรียน..."
          />
        </div>
        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <Filter className="w-4 h-4" />
          ตัวกรอง
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">นักเรียน</th>
                <th className="px-6 py-4">ความก้าวหน้า</th>
                <th className="px-6 py-4 text-center">แบบทดสอบก่อนเรียน</th>
                <th className="px-6 py-4 text-center">แบบทดสอบหลังเรียน</th>
                <th className="px-6 py-4 text-center">แบบฝึกหัด/อัตนัย</th>
                <th className="px-6 py-4 text-center">งานปฏิบัติ</th>
                <th className="px-6 py-4">เข้าเรียนล่าสุด</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                        <img src={student.avatar_url} alt={student.name} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{student.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">รหัสประจำตัว : {student.email ? student.email.split('@')[0].replace(/\D/g, '') : "ไม่ระบุ"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-full max-w-[120px] bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${Math.min(100, student.progress) === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${Math.min(100, student.progress)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-8">{Math.min(100, student.progress)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{student.preTest}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {student.postTest !== "-" ? (
                      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${student.postTestPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                        {student.postTest}
                        {student.postTestPassed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{student.quiz}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{student.assignment}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {student.lastActive}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StudentActionsMenu student={student} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
