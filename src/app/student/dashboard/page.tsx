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

  const courses = await getCourses(true);
  
  // Sort courses by title so "บทเรียนที่ 6" comes before "บทเรียนที่ 7"
  const ascCourses = [...(courses || [])].sort((a, b) => 
    (a.title || '').localeCompare(b.title || '', 'th', { numeric: true })
  );
  
  let completedLessonIds: string[] = [];
  let scoresData: any[] = [];
  const allCoursesCurriculum: any[] = [];
  let latestCourse: any = null;

  if (user) {
    // 1. Fetch user progress globally
    const [pRes, sRes, aRes] = await Promise.all([
      supabase.from('student_lesson_progress').select('lesson_id').eq('student_id', user.id),
      supabase.from('student_scores').select('lesson_id, score, total_score, exam_type, status').eq('student_id', user.id).neq('exam_type', 'access_log'),
      supabase.from('student_assignments').select('lesson_id').eq('student_id', user.id)
    ]);

    const failedPostTestIds = new Set<string>();
    const passedScoresIds: string[] = [];
    (sRes.data || []).forEach((s: any) => {
      const lid = String(s.lesson_id);
      const isPost = s.exam_type === 'post-test';
      const pct = s.total_score > 0 ? (s.score / s.total_score) * 100 : 0;
      if (isPost) {
        if (pct >= 50 && s.status !== 'pending') passedScoresIds.push(lid);
        else failedPostTestIds.add(lid);
      } else {
        if (s.status !== 'pending') passedScoresIds.push(lid);
      }
    });

    const combinedSet = new Set([
      ...(pRes.data || []).map((p: any) => String(p.lesson_id)).filter(id => !failedPostTestIds.has(id)),
      ...passedScoresIds,
      ...(aRes.data || []).map((a: any) => String(a.lesson_id)),
    ].filter(Boolean));

    completedLessonIds = Array.from(combinedSet);
  }

  if (ascCourses.length > 0) {
    const curricula = await Promise.all(
      ascCourses.map((c: any) => getCourseWithCurriculum(c.id.toString()))
    );

    curricula.forEach((curriculum, idx) => {
      if (curriculum) {
        allCoursesCurriculum.push({
          courseId: ascCourses[idx].id.toString(),
          modules: curriculum.modules || []
        });

        if (!latestCourse) {
          // Check if this course is fully completed
          const allLessonIds = (curriculum.modules || []).flatMap((m: any) => (m.lessons || []).map((l: any) => String(l.id)));
          const isCompleted = allLessonIds.length > 0 && allLessonIds.every((id: string) => completedLessonIds.includes(id));
          
          if (!isCompleted) {
            latestCourse = curriculum;
          }
        }
      }
    });

    // Fallback if all are completed or no modules found
    if (!latestCourse) {
      latestCourse = curricula[curricula.length - 1];
    }
  }

  if (user && latestCourse) {
    scoresData = await getStudentScores(user.id, latestCourse.id.toString()) || [];
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
