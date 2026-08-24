import { createClient } from "./supabase/server";
import { ExamViolationRecord, ViolationType, VIOLATION_TYPE_CONFIG } from "./exam-integrity";

/**
 * Fetch all exam violations joined with profiles and course info for admin monitoring
 */
export async function getExamViolations(limit: number = 500): Promise<ExamViolationRecord[]> {
  try {
    const supabase = await createClient();
    
    // Query exam_violations joined with profiles
    const { data: vData, error: vError } = await supabase
      .from('exam_violations')
      .select('*, profiles:student_id(id, full_name, email, avatar_url)')
      .order('detected_at', { ascending: false })
      .limit(limit);

    // Also fetch courses and lessons for readable names
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title, modules');

    const courseMap = new Map<string, { title: string; lessons: Map<string, string> }>();
    (coursesData || []).forEach((c: any) => {
      const parsedModules = Array.isArray(c.modules) ? c.modules : JSON.parse(c.modules || '[]');
      const lessonMap = new Map<string, string>();
      parsedModules.forEach((m: any) => {
        (m.lessons || []).forEach((l: any) => {
          lessonMap.set(String(l.id), l.title || `บทเรียน #${l.id}`);
        });
      });
      courseMap.set(String(c.id), { title: c.title, lessons: lessonMap });
    });

    if (vData && vData.length > 0) {
      return vData.map((item: any) => {
        const typeKey = (item.violation_type as ViolationType) || 'tab_switch';
        const config = VIOLATION_TYPE_CONFIG[typeKey] || VIOLATION_TYPE_CONFIG.tab_switch;
        const cInfo = courseMap.get(String(item.course_id));
        const lessonName = cInfo?.lessons.get(String(item.lesson_id)) || `แบบทดสอบ #${item.lesson_id}`;

        const dateObj = new Date(item.detected_at || item.created_at);
        const formattedDate = dateObj.toLocaleDateString('th-TH', {
          timeZone: 'Asia/Bangkok',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        return {
          id: item.id,
          studentId: item.student_id,
          studentName: item.profiles?.full_name || "ไม่ระบุชื่อ",
          studentEmail: item.profiles?.email || "-",
          studentAvatar: item.profiles?.avatar_url,
          courseId: String(item.course_id),
          courseTitle: cInfo?.title || `รายวิชา #${item.course_id}`,
          lessonId: String(item.lesson_id),
          lessonTitle: lessonName,
          violationType: typeKey,
          violationLabel: config.label,
          detectedAt: formattedDate,
          rawTimestamp: item.detected_at || item.created_at,
          attemptNumber: item.exam_attempt_number || 1
        };
      });
    }

    return [];
  } catch (err) {
    console.error("Error in getExamViolations:", err);
    return [];
  }
}
