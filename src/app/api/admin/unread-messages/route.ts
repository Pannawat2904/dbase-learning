import { NextResponse } from "next/server";
import { getAdminUnreadMessagesCount } from "@/utils/supabase/queries";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const unreadCount = await getAdminUnreadMessagesCount();
    return NextResponse.json({ unreadCount });
  } catch (error: any) {
    console.error("Error in /api/admin/unread-messages:", error);
    return NextResponse.json({ unreadCount: 0 });
  }
}
