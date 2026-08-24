import { createClient } from "./supabase/server";

export interface AccessLogData {
  studentId?: string;
  userName: string;
  email: string;
  role: "student" | "teacher" | "admin";
  event: "login" | "logout" | "login_failed";
  details?: string;
  ip?: string;
  userAgent?: string;
}

export async function logAccessEvent(log: AccessLogData) {
  try {
    const supabase = await createClient();
    const studentId = log.studentId || "00000000-0000-0000-0000-000000000000";
    
    await supabase.from("student_scores").insert([
      {
        student_id: studentId,
        course_id: "1",
        lesson_id: "1",
        exam_type: "access_log",
        score: log.event === "login" ? 1 : 0,
        total_score: 1,
        status: log.event,
        answers: {
          user_name: log.userName,
          email: log.email,
          role: log.role,
          event: log.event,
          details: log.details || (log.event === "login" ? "เข้าสู่ระบบสำเร็จ" : "ออกจากระบบ"),
          ip: log.ip || "-",
          user_agent: log.userAgent || "-",
          timestamp: new Date().toISOString()
        }
      }
    ]);
  } catch (error) {
    console.error("Failed to write access log:", error);
  }
}

export async function getAccessLogs(limit: number = 200) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("student_scores")
      .select("*")
      .eq("exam_type", "access_log")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching access logs:", error);
      return [];
    }

    return (data || []).map((item) => {
      const answers = (item.answers as any) || {};
      const createdAt = new Date(item.created_at);
      const thaiTime = createdAt.toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      return {
        id: item.id,
        studentId: item.student_id,
        userName: answers.user_name || "ไม่ระบุชื่อ",
        email: answers.email || "-",
        role: answers.role || "student",
        event: item.status || answers.event || "login",
        details: answers.details || (item.status === "login" ? "เข้าสู่ระบบสำเร็จ" : "ออกจากระบบ"),
        userAgent: answers.user_agent || "-",
        ip: answers.ip || "-",
        timestamp: thaiTime,
        rawTimestamp: item.created_at
      };
    });
  } catch (error) {
    console.error("Error in getAccessLogs:", error);
    return [];
  }
}
