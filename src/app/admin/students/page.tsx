import { Search, User, CheckCircle2, XCircle, Clock, Eye, EyeOff } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { getStudents, getAllStudentScores, getAllStudentProgress, getCourses, getAllStudentAssignments, getAllCertificates } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import StudentActionsMenu from "@/components/admin/StudentActionsMenu";
import AutoRefresh from "@/components/admin/AutoRefresh";
import ExportExcelButton from "@/components/admin/ExportExcelButton";
import CourseSelector from "@/components/admin/CourseSelector";
import StudentSearchAndSort from "@/components/admin/StudentSearchAndSort";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminStudentsPage(props: { searchParams?: any }) {
  const searchParams = await Promise.resolve(props.searchParams || {});
  const supabase = await createClient();
  const cookieStore = await cookies();
  const hiddenStudentsCookie = cookieStore.get('hidden_students')?.value;
  let hiddenStudentIds: string[] = [];
  if (hiddenStudentsCookie) {
    try {
      hiddenStudentIds = JSON.parse(hiddenStudentsCookie);
    } catch (e) {
      hiddenStudentIds = [];
    }
  }
  const showHidden = searchParams.showHidden === 'true';
  const [
    dbStudents,
    allScores,
    allProgress,
    allAssignments,
    courses,
    allCertificates,
    { data: allDbModules },
    { data: allDbLessons }
  ] = await Promise.all([
    getStudents(),
    getAllStudentScores(),
    getAllStudentProgress(),
    getAllStudentAssignments(),
    getCourses(),
    getAllCertificates(),
    supabase.from('modules').select('id, course_id'),
    supabase.from('lessons').select('id, module_id, type')
  ]);
  
  const activeCourseId = searchParams.course || courses[0]?.id?.toString();
  
  const courseModuleIds = new Set(allDbModules?.filter(m => String(m.course_id) === String(activeCourseId)).map(m => String(m.id)) || []);
  const courseLessons = allDbLessons?.filter(l => courseModuleIds.has(String(l.module_id))) || [];
  const courseLessonIds = new Set(courseLessons.map(l => String(l.id)));
  const totalLessons = courseLessons.length || 1;

  const nowTime = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  
  // Format real students
  const students = dbStudents?.map((student: any) => {
    // If course_id is missing on old scores, we can fallback to checking lesson_id
    const filteredScores = allScores?.filter((s: any) => 
      s.student_id === student.id && 
      (String(s.course_id) === String(activeCourseId) || courseLessonIds.has(String(s.lesson_id)))
    ) || [];

    const preTestScore = filteredScores.find((s: any) => s.exam_type === 'pre-test');
    const postTestScore = filteredScores.find((s: any) => s.exam_type === 'post-test');
    
    // Calculate Quiz and Assignment scores
    const quizScores = filteredScores.filter((s: any) => s.exam_type === 'quiz' && s.status === 'graded');
    const totalQuizScore = quizScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
    const totalQuizMax = quizScores.reduce((sum: number, s: any) => sum + (s.total_score || 0), 0);
    const quizText = quizScores.length > 0 ? `${totalQuizScore}/${totalQuizMax}` : "-";

    const studentAssignmentsList = allAssignments.filter((a: any) => a.student_id === student.id && a.score !== null && courseLessonIds.has(String(a.lesson_id)));
    const totalAssignmentScore = studentAssignmentsList.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
    const assignmentText = studentAssignmentsList.length > 0 ? `${totalAssignmentScore}` : "-";
    
    // Calculate progress based on unique lesson interactions (progress + scores + assignments)
    // Exclude failed post-test from progress
    const failedPostTestIds = new Set<string>();
    const passedScoresIds: string[] = [];

    filteredScores.forEach((s: any) => {
      const lid = String(s.lesson_id);
      const isPost = s.exam_type === 'post-test';
      const pct = s.total_score > 0 ? (s.score / s.total_score) * 100 : 0;
      if (isPost) {
        if (pct >= 50 && s.status !== 'pending') {
          passedScoresIds.push(lid);
        } else {
          failedPostTestIds.add(lid);
        }
      } else {
        if (s.status !== 'pending') {
          passedScoresIds.push(lid);
        }
      }
    });

    const studentCompletedLessonsSet = new Set([
      ...allProgress.filter((p: any) => p.student_id === student.id && (String(p.course_id) === String(activeCourseId) || courseLessonIds.has(String(p.lesson_id)))).map((p: any) => String(p.lesson_id)).filter(id => !failedPostTestIds.has(id)),
      ...passedScoresIds,
      ...allAssignments.filter((a: any) => a.student_id === student.id && courseLessonIds.has(String(a.lesson_id))).map((a: any) => String(a.lesson_id))
    ].filter(Boolean)); // filter out null/undefined
    
    const isPostTestPassed = postTestScore ? ((postTestScore.score / (postTestScore.total_score || 1)) >= 0.5) : false;
    const studentCertificates = allCertificates?.filter((c: any) => c.student_id === student.id && String(c.course_id) === String(activeCourseId)) || [];
    const hasCertificate = studentCertificates.length > 0;
    
    // Check assignments
    const courseAssignments = courseLessons.filter(l => l.type === 'assignment');
    const hasRequiredAssignments = courseAssignments.length > 0;
    const hasSubmittedAllAssignments = !hasRequiredAssignments || courseAssignments.every(a => 
      allAssignments.some((sa: any) => sa.student_id === student.id && String(sa.lesson_id) === String(a.id))
    );
    
    let calculatedProgress = Math.round((studentCompletedLessonsSet.size / totalLessons) * 100);
    // If they have a certificate OR passed the post-test AND submitted assignments, they are effectively 100% complete
    if (hasCertificate || (isPostTestPassed && hasSubmittedAllAssignments)) {
      calculatedProgress = 100;
    }
    const progress = Math.min(100, calculatedProgress);
    
    // Calculate last active & real-time status
    let lastActive = "ยังไม่เคยเข้าเรียน";
    let status = "Not Started";
    let statusLabel = "ยังไม่เริ่มเรียน";
    let statusColor = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

    const allActivityDates = [
      ...filteredScores.map((s: any) => new Date(s.created_at).getTime()),
      ...allProgress.filter((p: any) => p.student_id === student.id && (String(p.course_id) === String(activeCourseId) || courseLessonIds.has(String(p.lesson_id)))).map((p: any) => new Date(p.created_at).getTime()),
      ...allAssignments.filter((a: any) => a.student_id === student.id && courseLessonIds.has(String(a.lesson_id))).map((a: any) => new Date(a.created_at).getTime())
    ].filter(Boolean);
    
    if (allActivityDates.length > 0) {
      const maxTime = Math.max(...allActivityDates);
      const maxDate = new Date(maxTime);
      lastActive = maxDate.toLocaleDateString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      if (progress >= 100 && (!postTestScore || isPostTestPassed) && hasSubmittedAllAssignments) {
        status = "Completed";
        statusLabel = "เรียนจบแล้ว";
        statusColor = "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
      } else if (nowTime - maxTime < sevenDaysMs) {
        status = "Active";
        statusLabel = "กำลังเรียน";
        statusColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      } else {
        status = "Inactive";
        statusLabel = "ขาดการติดต่อ";
        statusColor = "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      }
    }
    
    return {
      id: student.id,
      name: student.full_name || "ไม่ระบุชื่อ",
      email: student.email,
      progress: progress,
      lastActive,
      status,
      statusLabel,
      statusColor,
      preTest: preTestScore ? `${preTestScore.score}/${preTestScore.total_score}` : "-",
      preTestId: preTestScore?.lesson_id,
      preTestStatus: preTestScore?.status,
      postTest: postTestScore ? `${postTestScore.score}/${postTestScore.total_score}` : "-",
      postTestId: postTestScore?.lesson_id,
      postTestStatus: postTestScore?.status,
      postTestPassed: isPostTestPassed,
      quiz: quizText,
      assignment: assignmentText,
      hasSubmittedAllAssignments,
      avatar_url: student.avatar_url || "",
      studentIdNum: student.email ? student.email.split('@')[0].replace(/\D/g, '') : "",
      hasCertificate: hasCertificate,
      certificates: studentCertificates,
      isHidden: hiddenStudentIds.includes(student.id)
    };
  }) || [];

  // Filter out hidden students if showHidden is false
  let displayStudents = students;
  if (!showHidden) {
    displayStudents = students.filter((s: any) => !s.isHidden);
  }

  // 1. Search Filter
  const searchQuery = (searchParams.q || "").toLowerCase();
  let filteredStudents = displayStudents;
  
  if (searchQuery) {
    const isThreeDigits = /^\d{3}$/.test(searchQuery);
    
    filteredStudents = displayStudents.filter((s: any) => {
      if (isThreeDigits) {
        return (s.name || "").startsWith(searchQuery) || (s.studentIdNum || "").endsWith(searchQuery);
      }
      return (
        (s.name || "").toLowerCase().includes(searchQuery) ||
        (s.email || "").toLowerCase().includes(searchQuery) ||
        (s.studentIdNum || "").includes(searchQuery)
      );
    });
  }

  // 2. Sorting
  const sortOption = searchParams.sort || "id_asc";
  
  filteredStudents.sort((a, b) => {
    switch (sortOption) {
      case "id_asc":
        return a.studentIdNum.localeCompare(b.studentIdNum, 'th', { numeric: true });
      case "id_desc":
        return b.studentIdNum.localeCompare(a.studentIdNum, 'th', { numeric: true });
      case "name_asc":
        return a.name.localeCompare(b.name, 'th');
      case "name_desc":
        return b.name.localeCompare(a.name, 'th');
      case "progress_desc":
        return b.progress - a.progress;
      case "progress_asc":
        return a.progress - b.progress;
      default:
        return a.studentIdNum.localeCompare(b.studentIdNum, 'th', { numeric: true });
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-48">
      <AutoRefresh interval={5000} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            จัดการนักเรียน
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {students.length} คน
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">ติดตามความก้าวหน้าและผลคะแนนของผู้เรียนแบบ Real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/students?${new URLSearchParams({
              ...(searchParams as any),
              showHidden: showHidden ? 'false' : 'true'
            }).toString()}`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {showHidden ? (
              <>
                <EyeOff className="w-4 h-4" />
                ซ่อนบัญชีที่ถูกปิดบัง
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                แสดงบัญชีที่ถูกปิดบัง
              </>
            )}
          </Link>
          <CourseSelector courses={courses} activeCourseId={activeCourseId} />
          <ExportExcelButton students={students} />
        </div>
      </div>

      {/* Filters & Search */}
      <StudentSearchAndSort defaultQuery={searchQuery} defaultSort={sortOption} />

      {/* Students Data Container: Desktop Table + Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">ข้อมูลนักเรียน</th>
                <th className="px-6 py-4">ความก้าวหน้า</th>
                <th className="px-6 py-4 text-center">Pre-Test</th>
                <th className="px-6 py-4 text-center">Post-Test</th>
                <th className="px-6 py-4 text-center">แบบทดสอบย่อย</th>
                <th className="px-6 py-4 text-center">ใบงาน</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4">เข้าเรียนล่าสุด</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                        {student.avatar_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{student.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">รหัสประจำตัว : {student.studentIdNum || "ไม่ระบุ"}</p>
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
                    <span className={`text-sm font-semibold ${student.assignment === "-" ? "text-red-500" : "text-slate-700 dark:text-slate-200"}`}>
                      {student.assignment === "-" ? "ยังไม่ส่ง" : student.assignment}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${student.statusColor}`}>
                      {student.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {student.lastActive}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StudentActionsMenu student={student} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    ไม่พบข้อมูลนักเรียนที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredStudents.length > 0 ? filteredStudents.map((student) => (
            <div key={student.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    {student.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{student.name}</h3>
                    <p className="text-xs text-slate-400">{student.email}</p>
                  </div>
                </div>
                <StudentActionsMenu student={student} />
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>ความก้าวหน้า</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(100, student.progress)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${Math.min(100, student.progress) === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                    style={{ width: `${Math.min(100, student.progress)}%` }}
                  ></div>
                </div>
              </div>

              {/* Score Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="text-slate-400 text-[10px]">Pre-Test</div>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">{student.preTest}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="text-slate-400 text-[10px]">Post-Test</div>
                  <div className={`font-bold mt-0.5 ${student.postTestPassed ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>{student.postTest}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="text-slate-400 text-[10px]">แบบทดสอบ</div>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">{student.quiz}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="text-slate-400 text-[10px]">ใบงาน</div>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">{student.assignment}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${student.statusColor}`}>
                  {student.statusLabel}
                </span>
                <span>เข้าเรียนล่าสุด: {student.lastActive}</span>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              ไม่พบข้อมูลนักเรียนที่ค้นหา
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
