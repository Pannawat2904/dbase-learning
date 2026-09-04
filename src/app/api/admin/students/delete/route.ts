import { NextRequest, NextResponse } from "next/server";
import { deleteStudentProfile } from "@/utils/supabase/queries";
import { cookies } from "next/headers";
import { verifyAdminCookie } from "@/utils/auth/admin";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('teacher_auth')?.value;
    const isAdmin = await verifyAdminCookie(token);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId } = body;

    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json({ error: "Invalid studentId" }, { status: 400 });
    }

    const success = await deleteStudentProfile(studentId);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete student account" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "ลบบัญชีนักเรียนออกจากระบบสำเร็จ" });
  } catch (error: any) {
    console.error("API POST /api/admin/students/delete error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
