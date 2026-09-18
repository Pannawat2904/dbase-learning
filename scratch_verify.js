const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://farrhzgxfexizmsiatrv.supabase.co', 'sb_publishable__5k-f_w4od2q4A_VhTrijA_1IR8Dtzz');

async function run() {
  const { data: responses, error } = await supabase
    .from('student_scores')
    .select('*')
    .eq('exam_type', 'satisfaction_survey');

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  const allOverallScores = [];
  responses.forEach(r => {
    const ans = r.answers || {};
    const score = Number(ans.overallAverage ?? r.score ?? 0);
    if (score > 0) allOverallScores.push(score);
  });

  const validNumbers = allOverallScores.filter((n) => Number.isFinite(n));
  const mean = validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
  const variance = validNumbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / (validNumbers.length - 1);
  const sd = Math.sqrt(variance);

  console.log(`จำนวนผู้ตอบที่นำมาคำนวณ = ${validNumbers.length} คน`);
  console.log(`Overall Mean = ${mean.toFixed(2)}`);
  console.log(`Overall S.D. = ${sd.toFixed(2)}`);
  
  // Checking dimensions and items briefly
  let hasRoundedValues = false;
  let hasReusedAnswers = false;
  
  responses.forEach(r => {
    const ans = r.answers || {};
    const ansScore = ans.overallAverage;
    const rScore = r.score;
    if (ansScore && ansScore !== Math.round(ansScore)) {
      hasReusedAnswers = true;
    }
  });

  console.log(`มีข้อมูลเก่าถูกนำกลับมาใช้จาก answers.overallAverage หรือไม่: ${hasReusedAnswers ? 'ใช่ (มีข้อมูลทศนิยมใน answers)' : 'ไม่มี'}`);
}
run();
