import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { studentId: reqStudentId, courseId, moduleId } = body;

    const studentId = user ? user.id : reqStudentId;
    if (!studentId || !courseId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let query = supabase.from('certificates').select('id').eq('student_id', studentId).eq('course_id', courseId);
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    } else {
      query = query.is('module_id', null);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, certificate: existing, alreadyIssued: true });
    }

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
      console.error("Error creating certificate:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, certificate: data });
  } catch (error: any) {
    console.error("Error in /api/student/issue-certificate:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
