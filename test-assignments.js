require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching assignments without join...');
  const res1 = await supabase.from('student_assignments').select('*');
  console.log('Result 1:', res1.error ? res1.error.message : `${res1.data.length} rows found.`);

  console.log('\nFetching assignments with join...');
  const res2 = await supabase.from('student_assignments').select(`*, lesson:lessons(id, title, course_id)`);
  console.log('Result 2:', res2.error ? res2.error.message : `${res2.data.length} rows found.`);
}

test();
