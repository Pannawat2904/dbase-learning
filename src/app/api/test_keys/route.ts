import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').limit(1);
  const { data: sData } = await supabase.from('settings').select('*').limit(1);
  return NextResponse.json({ profileKeys: Object.keys(data?.[0] || {}), settingsKeys: Object.keys(sData?.[0] || {}) });
}
