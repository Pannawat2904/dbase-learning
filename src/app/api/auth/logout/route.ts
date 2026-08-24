import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { logAccessEvent } from "@/utils/audit-logger";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
      const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'นักเรียน';

      await logAccessEvent({
        studentId: user.id,
        userName: fullName,
        email: user.email || '-',
        role: (profile?.role as any) || 'student',
        event: 'logout',
        details: 'ผู้ใช้ออกจากระบบ'
      });

      await supabase.auth.signOut();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
