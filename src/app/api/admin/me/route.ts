import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminCookie } from '@/utils/auth/admin';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('teacher_auth')?.value;
    
    if (!token || !(await verifyAdminCookie(token))) {
      return NextResponse.json({ authenticated: false, teacher: null }, { status: 401 });
    }

    const teacherId = cookieStore.get('teacher_id')?.value;
    
    if (teacherId && teacherId !== 'admin-fallback') {
      const supabase = await createClient();
      const { data: teacher, error } = await supabase
        .from('admin_users')
        .select('id, name, username, avatar_url, created_at')
        .eq('id', teacherId)
        .single();
        
      if (teacher && !error) {
        return NextResponse.json({
          authenticated: true,
          teacher: {
            id: teacher.id,
            name: teacher.name,
            username: teacher.username,
            avatar_url: teacher.avatar_url,
            created_at: teacher.created_at,
          }
        });
      }
    }

    // Fallback if not found in DB or using fallback admin account
    const nameRaw = cookieStore.get('teacher_name')?.value;
    let name = nameRaw ? decodeURIComponent(nameRaw) : 'ผู้ดูแลระบบ';
    if (name.includes('%')) name = decodeURIComponent(name);
    
    const avatarRaw = cookieStore.get('teacher_avatar')?.value;
    let avatar = avatarRaw ? decodeURIComponent(avatarRaw) : '';
    if (avatar.includes('%')) avatar = decodeURIComponent(avatar);
    const username = cookieStore.get('teacher_username')?.value || 'admin';

    return NextResponse.json({
      authenticated: true,
      teacher: {
        id: teacherId || 'admin-fallback',
        name,
        username,
        avatar_url: avatar
      }
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
