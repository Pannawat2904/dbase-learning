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

export async function getCourses(publishedOnly: boolean = false) {
  const supabase = await createClient();
  let query = supabase
    .from('courses')
    .select(`
      *,
      modules (
        id,
        lessons (id)
      )
    `)
    .order('created_at', { ascending: false });

  if (publishedOnly) {
    query = query.eq('status', 'Active');
  }

  const { data: courses, error } = await query;

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

export async function getAdminUnreadMessagesCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_role', 'student')
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching admin unread count:', error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error('Error in getAdminUnreadMessagesCount:', err);
    return 0;
  }
}

export async function getAdminPendingTasksCount() {
  try {
    const supabase = await createClient();
    
    const [
      { count: unreadCount },
      { count: pendingAssignmentsCount },
      { count: pendingEssaysCount }
    ] = await Promise.all([
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_role', 'student').eq('is_read', false),
      supabase.from('student_assignments').select('*', { count: 'exact', head: true }).is('score', null),
      supabase.from('student_scores').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    return {
      unreadMessages: unreadCount || 0,
      pendingAssignments: pendingAssignmentsCount || 0,
      pendingEssays: pendingEssaysCount || 0,
      totalPendingGrading: (pendingAssignmentsCount || 0) + (pendingEssaysCount || 0)
    };
  } catch (err) {
    console.error('Error in getAdminPendingTasksCount:', err);
    return { unreadMessages: 0, pendingAssignments: 0, pendingEssays: 0, totalPendingGrading: 0 };
  }
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
  let name = nameRaw ? decodeURIComponent(nameRaw) : 'ผู้ดูแลระบบ';
  if (name.includes('%')) name = decodeURIComponent(name);
  
  const avatarRaw = cookieStore.get('teacher_avatar')?.value;
  let avatar = avatarRaw ? decodeURIComponent(avatarRaw) : '';
  if (avatar.includes('%')) avatar = decodeURIComponent(avatar);
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
  let query = supabase
    .from('student_scores')
    .select('*')
    .eq('student_id', studentId)
    .neq('exam_type', 'access_log')
    .order('created_at', { ascending: true });
  
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
  
  // Send notification to student
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
  try {
    const supabase = await createClient();
    
    let query = supabase.from('certificates').select('id').eq('student_id', studentId).eq('course_id', courseId);
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    } else {
      query = query.is('module_id', null);
    }

    // Check if already issued
    const { data: existing } = await query.maybeSingle();
      
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
  } catch (err) {
    console.error('Error in issueCertificate:', err);
    return null;
  }
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
  
  // Get student_id to send notification later
  const { data: assignmentData } = await supabase
    .from('student_assignments')
    .select('student_id')
    .eq('id', assignmentId)
    .single();

  const { error } = await supabase
    .from('student_assignments')
    .update({ score, teacher_comment: teacherComment })
    .eq('id', assignmentId);

  if (error) {
    console.error('Error grading assignment:', error);
    return false;
  }
  
  // Send notification to student
  if (assignmentData?.student_id) {
    await supabase.from('messages').insert([{
      student_id: assignmentData.student_id,
      sender_role: 'admin',
      message: `แจ้งเตือนอัตโนมัติ: ครูได้ตรวจและให้คะแนนงานปฏิบัติของคุณแล้ว ได้คะแนน ${score} คะแนน`
    }]);
  }
  
  return true;
}


export async function resetStudentProgress(studentId: string) {
  await requireAdmin();
  const supabase = await createClient();
  
  // Delete all progress
  const { error: progError } = await supabase.from('student_lesson_progress').delete().eq('student_id', studentId);
  // Delete all exam scores
  const { error: examError } = await supabase.from('student_scores').delete().eq('student_id', studentId);
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
  await supabase.from('messages').delete().eq('student_id', studentId);
  
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

// ----------------------------------------------------
// SATISFACTION SURVEY FUNCTIONS
// ----------------------------------------------------

export interface SurveyDimensionItem {
  id: string;
  text: string;
}

export interface SurveyDimension {
  id: string;
  title: string;
  description?: string;
  items: SurveyDimensionItem[];
}

export interface SurveyConfigData {
  isOpen: boolean;
  title: string;
  description: string;
  scaleLevels: Array<{ value: number; label: string }>;
  dimensions: SurveyDimension[];
  updatedAt?: string;
}

export async function getSurveyConfig(): Promise<SurveyConfigData> {
  const defaultScaleLevels = [
    { value: 5, label: "มากที่สุด" },
    { value: 4, label: "มาก" },
    { value: 3, label: "ปานกลาง" },
    { value: 2, label: "น้อย" },
    { value: 1, label: "น้อยที่สุด" }
  ];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('student_scores')
      .select('*')
      .eq('exam_type', 'survey_config')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const answers = (data[0].answers as any) || {};
      return {
        isOpen: Boolean(answers.is_open),
        title: answers.title || "แบบประเมินความพึงพอใจต่อการใช้งานระบบเรียนรู้วิชาโปรแกรมฐานข้อมูลอัจฉริยะ (DBASE Learning AI)",
        description: answers.description || "คำชี้แจง: โปรดเลือกคะแนนระดับความพึงพอใจที่ตรงกับความคิดเห็นของท่านมากที่สุด โดยแบ่งเป็น 5 ระดับ (5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด)",
        scaleLevels: answers.scaleLevels || defaultScaleLevels,
        dimensions: Array.isArray(answers.dimensions) ? answers.dimensions : [],
        updatedAt: data[0].created_at
      };
    }
    return {
      isOpen: false,
      title: "แบบประเมินความพึงพอใจต่อการใช้งานระบบเรียนรู้วิชาโปรแกรมฐานข้อมูลอัจฉริยะ (DBASE Learning AI)",
      description: "คำชี้แจง: โปรดเลือกคะแนนระดับความพึงพอใจที่ตรงกับความคิดเห็นของท่านมากที่สุด โดยแบ่งเป็น 5 ระดับ (5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด)",
      scaleLevels: defaultScaleLevels,
      dimensions: []
    };
  } catch (error) {
    console.error('Error in getSurveyConfig:', error);
    return {
      isOpen: false,
      title: "แบบประเมินความพึงพอใจ",
      description: "",
      scaleLevels: defaultScaleLevels,
      dimensions: []
    };
  }
}

export async function updateSurveyConfig(updates: {
  isOpen?: boolean;
  title?: string;
  description?: string;
  dimensions?: SurveyDimension[];
}): Promise<boolean> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const currentConfig = await getSurveyConfig();

    const isOpen = updates.isOpen !== undefined ? updates.isOpen : currentConfig.isOpen;
    const title = updates.title !== undefined ? updates.title : currentConfig.title;
    const description = updates.description !== undefined ? updates.description : currentConfig.description;
    const dimensions = updates.dimensions !== undefined ? updates.dimensions : currentConfig.dimensions;

    // Insert new config record
    const { error } = await supabase.from('student_scores').insert([
      {
        student_id: '00000000-0000-0000-0000-000000000000',
        course_id: '1',
        lesson_id: '1',
        exam_type: 'survey_config',
        score: isOpen ? 1 : 0,
        total_score: 1,
        status: isOpen ? 'open' : 'closed',
        answers: {
          is_open: isOpen,
          title,
          description,
          scaleLevels: currentConfig.scaleLevels,
          dimensions,
          updated_at: new Date().toISOString()
        }
      }
    ]);

    if (error) {
      console.error('Error updating survey config:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in updateSurveyConfig:', error);
    return false;
  }
}

export async function getStudentSurveySubmission(studentId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('student_scores')
      .select('*')
      .eq('student_id', studentId)
      .eq('exam_type', 'satisfaction_survey')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { submitted: false, submission: null };
    }

    return {
      submitted: true,
      submission: {
        id: data[0].id,
        score: data[0].score,
        answers: data[0].answers,
        createdAt: data[0].created_at
      }
    };
  } catch (error) {
    console.error('Error in getStudentSurveySubmission:', error);
    return { submitted: false, submission: null };
  }
}

export async function submitSatisfactionSurvey(studentId: string, payload: {
  ratings: Record<string, number>;
  dimensionScores: Record<string, number>;
  suggestions: string;
  overallAverage: number;
}) {
  try {
    const supabase = await createClient();
    
    // Check if already submitted
    const existing = await getStudentSurveySubmission(studentId);
    if (existing.submitted) {
      return { success: false, message: 'คุณได้ส่งแบบประเมินความพึงพอใจไปแล้ว' };
    }

    const { error } = await supabase.from('student_scores').insert([
      {
        student_id: studentId,
        course_id: '1',
        lesson_id: '1',
        exam_type: 'satisfaction_survey',
        score: Number(payload.overallAverage.toFixed(2)),
        total_score: 5,
        status: 'submitted',
        answers: {
          ratings: payload.ratings,
          dimensionScores: payload.dimensionScores,
          suggestions: payload.suggestions,
          overallAverage: payload.overallAverage,
          submitted_at: new Date().toISOString()
        }
      }
    ]);

    if (error) {
      console.error('Error submitting survey:', error);
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in submitSatisfactionSurvey:', error);
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการบันทึก' };
  }
}

export async function getSurveyAnalytics() {
  try {
    const supabase = await createClient();
    
    // 1. Get all survey submissions
    const [
      { data: responses, error: respError },
      { data: profiles },
      config
    ] = await Promise.all([
      supabase.from('student_scores').select('*').eq('exam_type', 'satisfaction_survey').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'student'),
      getSurveyConfig()
    ]);

    const totalStudents = profiles?.length || 0;
    const totalRespondents = responses?.length || 0;

    if (respError || !responses || responses.length === 0) {
      return {
        isOpen: config.isOpen,
        title: config.title,
        description: config.description,
        dimensions: config.dimensions,
        scaleLevels: config.scaleLevels,
        totalStudents,
        totalRespondents: 0,
        responseRate: 0,
        overallMean: 0,
        overallSD: 0,
        overallQuality: 'ยังไม่มีข้อมูล',
        dimensionStats: {},
        itemStats: {},
        suggestions: [],
        respondentsList: []
      };
    }

    // Helper functions for statistics
    const calculateStats = (numbers: number[]) => {
      if (numbers.length === 0) return { mean: 0, sd: 0 };
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numbers.length > 1 ? numbers.length - 1 : 1);
      const sd = numbers.length > 1 ? Math.sqrt(variance) : 0;
      return {
        mean: Number(mean.toFixed(2)),
        sd: Number(sd.toFixed(2))
      };
    };

    const getQualityLabel = (mean: number) => {
      if (mean >= 4.50) return { text: 'มากที่สุด', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' };
      if (mean >= 3.50) return { text: 'มาก', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' };
      if (mean >= 2.50) return { text: 'ปานกลาง', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' };
      if (mean >= 1.50) return { text: 'น้อย', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400' };
      return { text: 'น้อยที่สุด', color: 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400' };
    };

    // Aggregate item ratings and dimension scores
    const allOverallScores: number[] = [];
    const itemRatingsMap: Record<string, number[]> = {};
    const dimensionRatingsMap: Record<string, number[]> = {};
    const suggestionsList: Array<{ name: string; text: string; date: string }> = [];

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const respondentsList = responses.map(r => {
      const ans = (r.answers as any) || {};
      const student = profileMap.get(r.student_id);
      const score = Number(r.score || ans.overallAverage || 0);
      allOverallScores.push(score);

      if (ans.ratings) {
        Object.entries(ans.ratings).forEach(([itemId, val]) => {
          if (!itemRatingsMap[itemId]) itemRatingsMap[itemId] = [];
          itemRatingsMap[itemId].push(Number(val));
        });
      }

      if (ans.dimensionScores) {
        Object.entries(ans.dimensionScores).forEach(([dimId, val]) => {
          if (!dimensionRatingsMap[dimId]) dimensionRatingsMap[dimId] = [];
          dimensionRatingsMap[dimId].push(Number(val));
        });
      }

      if (ans.suggestions && ans.suggestions.trim()) {
        suggestionsList.push({
          name: student?.full_name || 'นักเรียน',
          text: ans.suggestions.trim(),
          date: new Date(r.created_at).toLocaleDateString('th-TH', {
            timeZone: 'Asia/Bangkok',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        });
      }

      return {
        id: r.id,
        studentId: r.student_id,
        name: student?.full_name || 'นักเรียน',
        email: student?.email || '-',
        score,
        quality: getQualityLabel(score).text,
        submittedAt: new Date(r.created_at).toLocaleDateString('th-TH', {
          timeZone: 'Asia/Bangkok',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    });

    const overallStats = calculateStats(allOverallScores);
    const overallQuality = getQualityLabel(overallStats.mean);

    const dimensionStats: Record<string, { mean: number; sd: number; quality: string; qualityColor: string }> = {};
    Object.entries(dimensionRatingsMap).forEach(([dimId, vals]) => {
      const st = calculateStats(vals);
      const q = getQualityLabel(st.mean);
      dimensionStats[dimId] = {
        mean: st.mean,
        sd: st.sd,
        quality: q.text,
        qualityColor: q.color
      };
    });

    const itemStats: Record<string, { mean: number; sd: number; quality: string; qualityColor: string }> = {};
    Object.entries(itemRatingsMap).forEach(([itemId, vals]) => {
      const st = calculateStats(vals);
      const q = getQualityLabel(st.mean);
      itemStats[itemId] = {
        mean: st.mean,
        sd: st.sd,
        quality: q.text,
        qualityColor: q.color
      };
    });

    return {
      isOpen: config.isOpen,
      title: config.title,
      description: config.description,
      dimensions: config.dimensions,
      scaleLevels: config.scaleLevels,
      totalStudents,
      totalRespondents,
      responseRate: totalStudents > 0 ? Math.round((totalRespondents / totalStudents) * 100) : 0,
      overallMean: overallStats.mean,
      overallSD: overallStats.sd,
      overallQuality: overallQuality.text,
      overallQualityColor: overallQuality.color,
      dimensionStats,
      itemStats,
      suggestions: suggestionsList,
      respondentsList
    };
  } catch (error) {
    console.error('Error in getSurveyAnalytics:', error);
    return {
      isOpen: false,
      title: "แบบประเมินความพึงพอใจ",
      description: "",
      dimensions: [],
      scaleLevels: [],
      totalStudents: 0,
      totalRespondents: 0,
      responseRate: 0,
      overallMean: 0,
      overallSD: 0,
      overallQuality: '-',
      dimensionStats: {},
      itemStats: {},
      suggestions: [],
      respondentsList: []
    };
  }
}

