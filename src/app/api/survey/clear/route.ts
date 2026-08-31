import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE() {
  try {
    const supabase = await createClient();
    
    // Check if user is teacher (optional but good for security)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('student_scores')
      .delete()
      .eq('exam_type', 'satisfaction_survey');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
