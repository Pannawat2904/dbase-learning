import { createClient } from '@/utils/supabase/server';
import RealtimeDashboard from "@/components/student/RealtimeDashboard";
import { getCourses, getStudentScores, getStudentProgress, getCourseWithCurriculum } from "@/utils/supabase/queries";
import Link from "next/link";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let fullName = "นักเรียน";
  if (user) {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (data?.full_name) fullName = data.full_name;
  }

  const courses = await getCourses();
  
  // Concurrently fetch curriculum for all courses to calculate global stats
  const allCoursesCurriculum: any[] = [];
  let latestCourse: any = null;
  
  if (courses && courses.length > 0) {
    const curricula = await Promise.all(
      courses.map((c: any) => getCourseWithCurriculum(c.id.toString()))
    );

    curricula.forEach((curriculum, idx) => {
      if (curriculum) {
        allCoursesCurriculum.push({
          courseId: courses[idx].id.toString(),
          modules: curriculum.modules || []
        });
        if (!latestCourse) {
          latestCourse = curriculum;
        }
      }
    });
  }

  let completedLessonIds: string[] = [];
  let scoresData: any[] = [];

  if (user) {
    // Concurrently fetch global progress (progress + scores + assignments + scoresData)
    const [pRes, sRes, aRes, fetchedScores] = await Promise.all([
      supabase.from('student_lesson_progress').select('lesson_id').eq('student_id', user.id),
      supabase.from('student_scores').select('lesson_id').eq('student_id', user.id),
      supabase.from('student_assignments').select('lesson_id').eq('student_id', user.id),
      latestCourse ? getStudentScores(user.id, latestCourse.id.toString()) : Promise.resolve([])
    ]);

    const combinedSet = new Set([
      ...(pRes.data || []).map((p: any) => String(p.lesson_id)),
      ...(sRes.data || []).map((s: any) => String(s.lesson_id)),
      ...(aRes.data || []).map((a: any) => String(a.lesson_id)),
    ].filter(Boolean));

    completedLessonIds = Array.from(combinedSet);
    scoresData = fetchedScores || [];
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">สวัสดี, {fullName}</h1>
          <p className="text-slate-500 mt-1">ยินดีต้อนรับเข้าสู่ระบบ ข้อมูลการเรียนอัปเดตแบบเรียลไทม์ให้คุณแล้ว</p>
        </div>
      </div>

      <RealtimeDashboard
        userId={user?.id || ''}
        courseId={latestCourse?.id?.toString() || ''}
        courseTitle={latestCourse?.title || ''}
        courseDescription={latestCourse?.description || ''}
        modules={latestCourse?.modules || []}
        allCoursesModules={allCoursesCurriculum}
        initialCompletedIds={completedLessonIds}
        scoresData={scoresData}
      />
    </div>
  );
}
