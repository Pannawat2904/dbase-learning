import { NextResponse } from "next/server";
import { getAdminPendingTasksCount } from "@/utils/supabase/queries";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const tasks = await getAdminPendingTasksCount();
    // Maintain backwards compatibility for unreadCount while adding new fields
    return NextResponse.json({ 
      unreadCount: tasks.unreadMessages,
      ...tasks
    });
  } catch (error: any) {
    console.error("Error in /api/admin/unread-messages:", error);
    return NextResponse.json({ unreadCount: 0, unreadMessages: 0, pendingAssignments: 0, pendingEssays: 0, totalPendingGrading: 0 });
  }
}
