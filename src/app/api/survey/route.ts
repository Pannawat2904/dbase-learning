import { NextRequest, NextResponse } from "next/server";
import { 
  getSurveyConfig, 
  updateSurveyConfig, 
  getStudentSurveySubmission, 
  submitSatisfactionSurvey,
  getSurveyAnalytics
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');

    // Admin analytics
    if (mode === 'analytics') {
      const analytics = await getSurveyAnalytics();
      return NextResponse.json(analytics);
    }

    // Student status check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const config = await getSurveyConfig();
    let submissionInfo: { submitted: boolean; submission: any } = { submitted: false, submission: null };

    if (user) {
      submissionInfo = await getStudentSurveySubmission(user.id);
    }

    return NextResponse.json({
      isOpen: config.isOpen,
      title: config.title,
      description: config.description,
      scaleLevels: config.scaleLevels,
      dimensions: config.dimensions,
      updatedAt: config.updatedAt,
      isSubmitted: submissionInfo.submitted,
      submission: submissionInfo.submission
    });
  } catch (error: any) {
    console.error("API GET /api/survey error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch survey data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำแบบประเมิน" }, { status: 401 });
    }

    const config = await getSurveyConfig();
    if (!config.isOpen) {
      return NextResponse.json({ error: "แบบประเมินยังไม่เปิดให้ทำในขณะนี้" }, { status: 403 });
    }

    const body = await req.json();
    const { ratings, dimensionScores, suggestions, overallAverage } = body;

    if (!ratings || overallAverage === undefined) {
      return NextResponse.json({ error: "ข้อมูลแบบประเมินไม่ครบถ้วน" }, { status: 400 });
    }

    const result = await submitSatisfactionSurvey(user.id, {
      ratings,
      dimensionScores: dimensionScores || {},
      suggestions: suggestions || "",
      overallAverage: Number(overallAverage)
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "บันทึกผลการประเมินความพึงพอใจสำเร็จ" });
  } catch (error: any) {
    console.error("API POST /api/survey error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { isOpen, title, description, dimensions } = body;

    const success = await updateSurveyConfig({
      isOpen: typeof isOpen === "boolean" ? isOpen : undefined,
      title: typeof title === "string" ? title : undefined,
      description: typeof description === "string" ? description : undefined,
      dimensions: Array.isArray(dimensions) ? dimensions : undefined
    });

    if (!success) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ผู้ดูแลระบบ หรือเกิดข้อผิดพลาดในการบันทึก" }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: "บันทึกการตั้งค่าแบบประเมินสำเร็จ" });
  } catch (error: any) {
    console.error("API PATCH /api/survey error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
