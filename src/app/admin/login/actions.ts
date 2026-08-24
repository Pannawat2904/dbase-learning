'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { signAdminCookie } from '@/utils/auth/admin'
import { logAccessEvent } from '@/utils/audit-logger'

export async function loginTeacher(formData: FormData) {
  const username = (formData.get('username') as string || '').trim();
  const password = (formData.get('password') as string || '').trim();

  if (!username || !password) {
    redirect('/admin/login?error=' + encodeURIComponent('กรุณากรอก Username และ Password'));
  }

  const supabase = await createClient();
  const { data: user } = await supabase
    .from('admin_users')
    .select('*')
    .ilike('username', username)
    .single();

  // Very basic password check (since this is internal)
  const isValid = user && user.password_hash === password;

  // Fallback to hardcoded admin just in case DB isn't set up yet
  const isFallback = username.toLowerCase() === 'admin' && password === 'admin1234';

  if (isValid || isFallback) {
    const cookieStore = await cookies();
    const teacherId = user?.id || 'admin-fallback';
    const teacherName = user?.name || (isFallback ? 'Admin' : 'Teacher');
    const teacherUsername = user?.username || (isFallback ? 'admin' : username);
    const teacherAvatar = user?.avatar_url || '';

    const signedAuthToken = await signAdminCookie(`teacher:${teacherId}`);
    
    // Cookie options
    const cookieOptions = {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      sameSite: 'lax' as const,
    };

    // 1. Auth Token (httpOnly for security)
    cookieStore.set('teacher_auth', signedAuthToken, {
      ...cookieOptions,
      httpOnly: true,
    });

    // 2. Identity info (URL-encoded to prevent header invalid character errors with Thai names)
    cookieStore.set('teacher_id', teacherId, cookieOptions);
    cookieStore.set('teacher_name', encodeURIComponent(teacherName), cookieOptions);
    cookieStore.set('teacher_username', teacherUsername, cookieOptions);
    
    if (teacherAvatar) {
      cookieStore.set('teacher_avatar', encodeURIComponent(teacherAvatar), cookieOptions);
    } else {
      cookieStore.delete('teacher_avatar');
    }

    // Record Access Log
    await logAccessEvent({
      studentId: user?.id,
      userName: teacherName,
      email: teacherUsername + '@lms.teacher',
      role: isFallback ? 'admin' : 'teacher',
      event: 'login',
      details: 'ครูผู้สอนเข้าสู่ระบบสำเร็จ'
    });

    redirect('/admin');
  } else {
    redirect('/admin/login?error=' + encodeURIComponent('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
  }
}

export async function logoutTeacher() {
  const cookieStore = await cookies();
  const rawTeacherName = cookieStore.get('teacher_name')?.value;
  const rawTeacherUsername = cookieStore.get('teacher_username')?.value;
  const teacherName = rawTeacherName ? decodeURIComponent(rawTeacherName) : 'ครูผู้สอน';
  const teacherUsername = rawTeacherUsername ? decodeURIComponent(rawTeacherUsername) : 'teacher';

  await logAccessEvent({
    userName: teacherName,
    email: teacherUsername + '@lms.teacher',
    role: 'teacher',
    event: 'logout',
    details: 'ครูผู้สอนออกจากระบบ'
  });

  cookieStore.delete('teacher_auth');
  cookieStore.delete('teacher_id');
  cookieStore.delete('teacher_name');
  cookieStore.delete('teacher_username');
  cookieStore.delete('teacher_avatar');
  redirect('/admin/login');
}
