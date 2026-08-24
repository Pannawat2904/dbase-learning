import { createClient } from "./supabase/client";

export type ViolationType = 'tab_switch' | 'copy_attempt' | 'right_click' | 'devtools_open' | 'window_blur';

export interface ExamViolationRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  courseId: string;
  courseTitle?: string;
  lessonId: string;
  lessonTitle?: string;
  violationType: ViolationType;
  violationLabel: string;
  detectedAt: string;
  rawTimestamp: string;
  attemptNumber: number;
}

export const VIOLATION_TYPE_CONFIG: Record<ViolationType, { label: string; description: string; color: string; bg: string; border: string }> = {
  tab_switch: {
    label: "สลับหน้าจอ (Tab Switch)",
    description: "สลับไปแท็บอื่นหรือย่อหน้าต่างระหว่างทำข้อสอบ",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/40"
  },
  window_blur: {
    label: "สลับออกนอกเบราว์เซอร์ (Window Blur)",
    description: "คลิกหรือเปิดโปรแกรมอื่นนอกหน้าต่างเบราว์เซอร์",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800/40"
  },
  copy_attempt: {
    label: "พยายามคัดลอก (Copy Attempt)",
    description: "พยายามคัดลอกข้อความหรือโจทย์ข้อสอบ",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800/40"
  },
  right_click: {
    label: "คลิกขวา (Right Click)",
    description: "พยายามคลิกขวาเพื่อเปิดเมนูลัดหรือตรวจสอบองค์ประกอบ",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800/40"
  },
  devtools_open: {
    label: "เปิดเครื่องมือนักพัฒนา (DevTools)",
    description: "พยายามเปิด Console หรือ Inspect Element",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800/40"
  }
};

/**
 * Log exam violation from client-side (fire-and-forget, non-blocking)
 */
export async function logExamViolation(
  studentId: string,
  courseId: string,
  lessonId: string,
  violationType: ViolationType,
  attemptNumber: number = 1
) {
  if (!studentId) return;

  try {
    const supabase = createClient();
    
    // Primary insert to exam_violations table
    const { error } = await supabase.from('exam_violations').insert({
      student_id: studentId,
      course_id: String(courseId),
      lesson_id: String(lessonId),
      violation_type: violationType,
      detected_at: new Date().toISOString(),
      exam_attempt_number: attemptNumber
    });

    if (error) {
      console.warn("Exam violation insert note:", error.message);
    }
  } catch (err) {
    console.warn("Error logging exam violation:", err);
  }
}
