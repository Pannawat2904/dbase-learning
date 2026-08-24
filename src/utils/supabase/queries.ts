'use server'

import { createClient } from './server';
import { cookies } from 'next/headers';
import { verifyAdminCookie } from '../auth/admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('teacher_auth')?.value;
  if (!(await verifyAdminCookie(token))) {
    throw new Error('Unauthorized: Admin access required');
  }
}

export async function getCourses() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      *,
      modules (
        id,
        lessons (id)
      )
    `)
    .order('created_at', { ascending: false });

  if (error || !courses) {
    console.error('Error fetching courses:', error);
    return [];
  }

  // Fetch student scores, certificates, and profiles to count real-time active learners per course
  const [
    { data: scores },
    { data: certs },
    { count: totalStudentsCount }
  ] = await Promise.all([
    supabase.from('student_scores').select('course_id, student_id'),
    supabase.from('certificates').select('course_id, student_id'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student')
  ]);

  const courseStudentsMap = new Map<string, Set<string>>();

  if (scores) {
    scores.forEach((s: any) => {
      if (s.course_id && s.student_id) {
        const cId = String(s.course_id);
        if (!courseStudentsMap.has(cId)) courseStudentsMap.set(cId, new Set());
        courseStudentsMap.get(cId)!.add(s.student_id);
      }
    });
  }

  if (certs) {
    certs.forEach((c: any) => {
      if (c.course_id && c.student_id) {
        const cId = String(c.course_id);
        if (!courseStudentsMap.has(cId)) courseStudentsMap.set(cId, new Set());
        courseStudentsMap.get(cId)!.add(c.student_id);
      }
    });
  }

  // Map to include total lessons and actual real-time student count
  return courses.map(course => {
    let totalLessons = 0;
    if (course.modules) {
      course.modules.forEach((m: any) => {
        totalLessons += m.lessons ? m.lessons.length : 0;
      });
    }
    const cId = String(course.id);
    const studentCount = courseStudentsMap.get(cId)?.size || 0;

    return {
      ...course,
      totalLessons,
      studentCount,
      totalEnrolledStudents: totalStudentsCount || 0
    };
  });
}

export async function getCourseWithCurriculum(courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      modules (
        *,
        lessons (*)
      )
    `)
    .eq('id', courseId)
    .single();

  if (error) {
    console.error('Error fetching course curriculum:', error);
    return null;
  }

  // Sort modules and lessons by order_index
  if (data && data.modules) {
    data.modules.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    data.modules.forEach((m: any) => {
      if (m.lessons) {
        m.lessons.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      }
    });
  }

  return data;
}

export async function createCourse(title: string, code: string = '', description: string = '') {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .insert([{ title, code, description, status: 'Draft' }])
    .select()
    .single();

  if (error) {
    console.error('Error creating course:', error);
    return null;
  }
  return data;
}

export async function updateCourse(courseId: string, updates: any) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId);

  if (error) {
    console.error('Error updating course:', error);
    return error.message;
  }
  return true;
}

export async function getDashboardStats() {
  const supabase = await createClient();
  
  // Get total courses, students, and recent activity
  const [
    { count: coursesCount },
    { count: studentsCount },
    { data: allScores },
    { data: allMessages },
    { data: allAILogs }
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('student_scores').select('student_id, created_at'),
    supabase.from('messages').select('student_id, created_at'),
    supabase.from('ai_chat_logs').select('student_id, created_at')
  ]);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const todayActiveStudents = new Set<string>();

  [...(allScores || []), ...(allMessages || []), ...(allAILogs || [])].forEach((item: any) => {
    if (item.created_at >= oneDayAgo && item.student_id) {
      todayActiveStudents.add(item.student_id);
    }
  });

  const totalActs = allScores?.length || 0;
  const avgMins = Math.round((totalActs * 20) / Math.max(1, studentsCount || 1));
  const avgHours = (avgMins / 60).toFixed(1);

  return {
    totalCourses: coursesCount || 0,
    totalStudents: studentsCount || 0,
    avgStudyTime: `${avgHours} ชม.`,
    todayActive: todayActiveStudents.size > 0 ? todayActiveStudents.size : (allScores?.length ? 2 : 0)
  };
}

export async function getStudents() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }
  
  return data;
}

export async function sendNotification(userId: string, title: string, message: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .insert([
      { user_id: userId, title, message }
    ]);
    
  if (error) {
    console.error('Error sending notification:', error);
    return false;
  }
  return true;
}

export async function getNotifications(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data;
}

export async function markNotificationAsRead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
    
  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
  return true;
}

// Two-way Messaging (Chat) Queries
export async function sendChatMessage(studentId: string, senderRole: 'admin' | 'student', message: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('messages')
    .insert([
      { student_id: studentId, sender_role: senderRole, message }
    ]);
    
  if (error) {
    console.error('Error sending chat message:', error);
    return false;
  }
  return true;
}

export async function getChatMessages(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }
  return data;
}

export async function getInboxSummaries() {
  const supabase = await createClient();
  
  // 1. Get all students
  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .eq('role', 'student');
    
  if (studentsError) {
    console.error('Error fetching students for inbox:', studentsError);
    return [];
  }

  // 2. Get all messages
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  // 3. Map messages to students
  const summariesMap = new Map();
  for (const student of students) {
    summariesMap.set(student.id, {
      student: student,
      latestMessage: 'ยังไม่มีข้อความ',
      latestMessageTime: null,
      unreadCount: 0
    });
  }

  if (messages) {
    for (const msg of messages) {
      if (summariesMap.has(msg.student_id)) {
        const summary = summariesMap.get(msg.student_id);
        
        // Since messages are ordered descending, the first one we see is the latest
        if (!summary.latestMessageTime) {
          summary.latestMessage = msg.message;
          summary.latestMessageTime = msg.created_at;
        }

        if (msg.sender_role === 'student' && !msg.is_read) {
          summary.unreadCount += 1;
        }
      }
    }
  }

  // Convert to array and sort by latest message time (recent first, nulls last)
  const result = Array.from(summariesMap.values());
  result.sort((a, b) => {
    if (!a.latestMessageTime && !b.latestMessageTime) return 0;
    if (!a.latestMessageTime) return 1;
    if (!b.latestMessageTime) return -1;
    return new Date(b.latestMessageTime).getTime() - new Date(a.latestMessageTime).getTime();
  });

  return result;
}

export async function markChatAsRead(studentId: string, roleToMark: 'admin' | 'student') {
  const supabase = await createClient();
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('student_id', studentId)
    .eq('sender_role', roleToMark);
    
  if (error) {
    console.error('Error marking chat as read:', error);
    return false;
  }
  return true;
}

// Course Content Management (Modules & Lessons)
export async function createModule(courseId: string, title: string, orderIndex: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('modules')
    .insert([{ course_id: courseId, title, order_index: orderIndex }])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating module:', error);
    return null;
  }
  return data;
}

export async function updateModule(moduleId: string, title: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('modules')
    .update({ title })
    .eq('id', moduleId);
    
  if (error) {
    console.error('Error updating module:', error);
    return false;
  }
  return true;
}

export async function createLesson(moduleId: string, title: string, type: string, orderIndex: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .insert([{ module_id: moduleId, title, type, order_index: orderIndex, content: {} }])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating lesson:', error);
    return null;
  }
  return data;
}

export async function updateLesson(lessonId: string, updates: any) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', lessonId);
    
  if (error) {
    console.error('Error updating lesson:', error);
    return error.message || 'Unknown error';
  }
  return true;
}

export async function deleteLesson(lessonId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId);
    
  if (error) {
    console.error('Error deleting lesson:', error);
    return false;
  }
  return true;
}

export async function getLesson(lessonId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      modules (
        id,
        course_id
      )
    `)
    .eq('id', lessonId)
    .single();
    
  if (error) {
    console.error('Error fetching lesson:', error);
    return null;
  }
  return data;
}

// Order Updates
export async function updateModuleOrder(updates: { id: string | number; order_index: number }[]) {
  await requireAdmin();
  const supabase = await createClient();
  
  const promises = updates.map(update => 
    supabase.from('modules').update({ order_index: update.order_index }).eq('id', update.id)
  );
  
  const results = await Promise.all(promises);
  const error = results.find(r => r.error)?.error;
  
  if (error) {
    console.error('Error updating module order:', error);
    return error.message;
  }
  return true;
}

export async function updateLessonOrder(updates: { id: string | number; order_index: number }[]) {
  await requireAdmin();
  const supabase = await createClient();
  
  // Use Promise.all with update to avoid missing NOT NULL column errors with upsert
  const promises = updates.map(update => 
    supabase.from('lessons').update({ order_index: update.order_index }).eq('id', update.id)
  );
  
  const results = await Promise.all(promises);
  const error = results.find(r => r.error)?.error;
  
  if (error) {
    console.error('Error updating lesson order:', error);
    return error.message;
  }
  return true;
}

// Admin Users (Teachers) Management
export async function getAdminUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
  return data;
}

export async function createAdminUser(name: string, username: string, password_hash: string, avatar_url: string = "") {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_users')
    .insert([{ name, username, password_hash, avatar_url }])
    .select()
    .single();

  if (error) {
    console.error('Error creating admin user:', error);
    return null;
  }
  return data;
}

export async function deleteAdminUser(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting admin user:', error);
    return false;
  }
  return true;
}

export async function getCurrentTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get('teacher_auth')?.value;
  if (!token || !(await verifyAdminCookie(token))) {
    return null;
  }

  const teacherId = cookieStore.get('teacher_id')?.value;
  if (teacherId && teacherId !== 'admin-fallback') {
    const supabase = await createClient();
    const { data: teacher } = await supabase
      .from('admin_users')
      .select('id, name, username, avatar_url, created_at')
      .eq('id', teacherId)
      .single();
    if (teacher) return teacher;
  }

  const nameRaw = cookieStore.get('teacher_name')?.value;
  const name = nameRaw ? decodeURIComponent(nameRaw) : 'ผู้ดูแลระบบ';
  const avatarRaw = cookieStore.get('teacher_avatar')?.value;
  const avatar = avatarRaw ? decodeURIComponent(avatarRaw) : '';
  const username = cookieStore.get('teacher_username')?.value || 'admin';

  return {
    id: teacherId || 'admin-fallback',
    name,
    username,
    avatar_url: avatar
  };
}

export async function updateTeacherProfile(id: string, updates: { name?: string; username?: string; password_hash?: string; avatar_url?: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating teacher profile:', error);
    return null;
  }

  // Also update cookie if the current logged in teacher updated their own info
  const cookieStore = await cookies();
  const currentId = cookieStore.get('teacher_id')?.value;
  if (currentId === id) {
    if (updates.name) {
      cookieStore.set('teacher_name', encodeURIComponent(updates.name), { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });
    }
    if (updates.username) {
      cookieStore.set('teacher_username', updates.username, { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });
    }
    if (updates.avatar_url !== undefined) {
      if (updates.avatar_url) {
        cookieStore.set('teacher_avatar', encodeURIComponent(updates.avatar_url), { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });
      } else {
        cookieStore.delete('teacher_avatar');
      }
    }
  }

  return data;
}

// System Settings
export async function getSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching settings:', error);
  }
  return data;
}

export async function updateSettings(updates: any) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: existing } = await supabase.from('settings').select('id').single();
  
  let result;
  if (existing) {
    result = await supabase.from('settings').update(updates).eq('id', existing.id);
  } else {
    result = await supabase.from('settings').insert([updates]);
  }
  
  if (result.error) {
    console.error('Error updating settings:', result.error);
    return false;
  }
  return true;
}

export async function saveExamScore(
  studentId: string, 
  courseId: string, 
  lessonId: string, 
  score: number, 
  totalScore: number, 
  examType: string = 'quiz',
  answers: Record<string, any> = {},
  status: string = 'graded'
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_scores')
    .insert([{ 
      student_id: studentId, 
      course_id: courseId,
      lesson_id: lessonId, 
      score, 
      total_score: totalScore,
      exam_type: examType,
      answers,
      status
    }])
    .select()
    .single();

  if (error) {
    console.error('Error saving exam score:', error);
    return null;
  }
  return data;
}

export async function getStudentScores(studentId: string, courseId?: string) {
  const supabase = await createClient();
  let query = supabase.from('student_scores').select('*').eq('student_id', studentId).order('created_at', { ascending: true });
  
  if (courseId) {
    query = query.eq('course_id', courseId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching student scores:', error);
    return [];
  }
  return data;
}

export async function resetStudentAssignments(studentId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('student_assignments')
    .delete()
    .eq('student_id', studentId);
    
  if (error) {
    console.error('Error resetting student assignments:', error);
    return false;
  }
  return true;
}

export async function getPendingEssays() {
  const supabase = await createClient();
  const { data: scores, error } = await supabase
    .from('student_scores')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
    
  if (error || !scores) {
    console.error('Error fetching pending essays:', error);
    return [];
  }

  // Fetch course and lesson details manually since foreign keys might not exist
  const result = await Promise.all(scores.map(async (score) => {
    let course = null;
    let lesson = null;
    
    if (score.course_id) {
      const { data } = await supabase.from('courses').select('title').eq('id', score.course_id).single();
      course = data;
    }
    if (score.lesson_id) {
      const { data } = await supabase.from('lessons').select('title, content').eq('id', score.lesson_id).single();
      lesson = data;
    }

    return { ...score, course, lesson };
  }));
  
  return result;
}

export async function updateEssayScore(id: string, additionalScore: number) {
  await requireAdmin();
  const supabase = await createClient();
  
  // First get the current score
  const { data: scoreData } = await supabase
    .from('student_scores')
    .select('score, student_id, lesson_id, exam_type')
    .eq('id', id)
    .single();
    
  if (!scoreData) return null;
  
  const newScore = (scoreData.score || 0) + additionalScore;
  
  const { data, error } = await supabase
    .from('student_scores')
    .update({ 
      score: newScore,
      status: 'graded'
    })
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating essay score:', error);
    return null;
  }
  
  // Send notification message to student
  if (scoreData.student_id) {
    const examName = scoreData.exam_type === 'pre-test' ? 'แบบทดสอบก่อนเรียน' : 
                     scoreData.exam_type === 'post-test' ? 'แบบทดสอบหลังเรียน' : 'แบบฝึกหัด/ข้อสอบ';
    await sendChatMessage(
      scoreData.student_id, 
      'admin', 
      `แจ้งเตือนอัตโนมัติ: คุณครูได้ตรวจให้คะแนนข้อเขียนของคุณใน "${examName}" เรียบร้อยแล้ว ได้คะแนนรวม ${newScore} คะแนนครับ สามารถเข้าไปดูรายละเอียดได้เลยครับ`
    );
  }
  
  return data;
}

export async function getAllStudentScores() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_scores')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching all student scores:', error);
    return [];
  }
  return data;
}

export async function getCertificates(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      course:courses (
        title
      ),
      module:modules (
        title
      )
    `)
    .eq('student_id', studentId)
    .order('issued_at', { ascending: false });

  if (error) {
    console.error('Error fetching certificates:', error);
    return [];
  }
  return data;
}

export async function issueCertificate(studentId: string, courseId: string, moduleId?: string) {
  await requireAdmin();
  const supabase = await createClient();
  
  let query = supabase.from('certificates').select('id').eq('student_id', studentId).eq('course_id', courseId);
  if (moduleId) {
    query = query.eq('module_id', moduleId);
  } else {
    query = query.is('module_id', null);
  }

  // Check if already issued
  const { data: existing } = await query.single();
    
  if (existing) return existing;

  const { data, error } = await supabase
    .from('certificates')
    .insert([{ 
      student_id: studentId, 
      course_id: courseId,
      module_id: moduleId || null
    }])
    .select()
    .single();

  if (error) {
    console.error('Error issuing certificate:', error);
    return null;
  }
  return data;
}

export async function deleteExamScore(studentId: string, lessonId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('student_scores')
    .delete()
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId);
    
  if (error) {
    console.error('Error deleting exam score:', error);
    return false;
  }
  return true;
}
export async function getAllStudentProgress() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_lesson_progress')
    .select('*');
    
  if (error) {
    console.error('Error fetching all progress:', error);
    return [];
  }
  return data;
}

export async function getStudentProgress(studentId: string, courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_lesson_progress')
    .select('lesson_id')
    .eq('student_id', studentId)
    .eq('course_id', courseId);
    
  if (error) {
    console.error('Error fetching progress:', error);
    return [];
  }
  return data.map(d => d.lesson_id);
}

export async function saveStudentProgress(studentId: string, courseId: string, lessonId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('student_lesson_progress')
    .upsert(
      { student_id: studentId, course_id: courseId, lesson_id: lessonId },
      { onConflict: 'student_id,lesson_id' }
    );
    
  if (error) {
    console.error('Error saving progress:', error);
    return false;
  }
  return true;
}

export async function getStudentAssignments(studentId: string, lessonId?: string) {
  const supabase = await createClient();
  let query = supabase.from('student_assignments').select('*').eq('student_id', studentId);
  if (lessonId) query = query.eq('lesson_id', lessonId);
  
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
  return data;
}

export async function submitAssignment(studentId: string, lessonId: string, fileUrl: string, fileName: string, studentNote: string = '') {
  const supabase = await createClient();
  const { error } = await supabase
    .from('student_assignments')
    .insert({
      student_id: studentId,
      lesson_id: lessonId,
      file_url: fileUrl,
      file_name: fileName,
      student_note: studentNote
    });
    
  if (error) {
    console.error('Error submitting assignment:', error);
    return false;
  }
  return true;
}

export async function getPendingAssignments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_assignments')
    .select(`
      *,
      lesson:lessons(id, title)
    `)
    .is('score', null)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending assignments:', error);
    return [];
  }
  return data;
}

export async function gradeAssignment(assignmentId: string, score: number, teacherComment: string = '') {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('student_assignments')
    .update({ score, teacher_comment: teacherComment })
    .eq('id', assignmentId);

  if (error) {
    console.error('Error grading assignment:', error);
    return false;
  }
  return true;
}


export async function resetStudentProgress(studentId: string) {
  await requireAdmin();
  const supabase = await createClient();
  
  // Delete all progress
  const { error: progError } = await supabase.from('student_progress').delete().eq('user_id', studentId);
  // Delete all exam scores
  const { error: examError } = await supabase.from('exam_scores').delete().eq('student_id', studentId);
  // Delete all assignments
  const { error: assignError } = await supabase.from('student_assignments').delete().eq('student_id', studentId);
  
  if (progError || examError || assignError) {
    console.error('Error resetting progress:', progError || examError || assignError);
    return false;
  }
  return true;
}

export async function deleteStudentProfile(studentId: string) {
  await requireAdmin();
  const supabase = await createClient();
  
  // Clean up all related data first
  await resetStudentProgress(studentId);
  await supabase.from('chat_messages').delete().eq('sender_id', studentId);
  await supabase.from('chat_messages').delete().eq('receiver_id', studentId);
  
  // Delete the profile
  const { error } = await supabase.from('profiles').delete().eq('id', studentId);
  
  if (error) {
    console.error('Error deleting student profile:', error);
    return false;
  }
  return true;
}

export async function getAllStudentAssignments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_assignments')
    .select('*');
    
  if (error) {
    console.error('Error fetching all assignments:', error);
    return [];
  }
  return data;
}
