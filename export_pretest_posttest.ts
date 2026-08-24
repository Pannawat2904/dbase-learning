import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load environment variables from .env.local if not loaded
function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          const val = values.join('=').replace(/(^"|"$|^'|'$)/g, '');
          process.env[key.trim()] = val.trim();
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL or Key is missing. Please check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ResearchRow {
  student_id: string;
  student_name: string;
  email: string;
  pretest_score: number | string;
  pretest_total: number | string;
  pretest_percent: number | string;
  posttest_score: number | string;
  posttest_total: number | string;
  posttest_percent: number | string;
  gain_score: number | string;
  gain_percent: number | string;
}

async function exportPretestPosttest() {
  console.log('🚀 เริ่มดึงข้อมูลคะแนน Pre-test และ Post-test สำหรับงานวิจัย...');

  // 1. ดึงข้อมูลนักเรียนทั้งหมดจากตาราง profiles
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'student');

  if (profileErr) {
    console.error('❌ ดึงข้อมูล profiles ล้มเหลว:', profileErr);
    return;
  }

  // 2. ดึงข้อมูลคะแนน student_scores เฉพาะ pre-test และ post-test เรียงตาม created_at
  const { data: scores, error: scoresErr } = await supabase
    .from('student_scores')
    .select('*')
    .in('exam_type', ['pre-test', 'post-test'])
    .order('created_at', { ascending: true });

  if (scoresErr) {
    console.error('❌ ดึงข้อมูล student_scores ล้มเหลว:', scoresErr);
    return;
  }

  console.log(`📊 พบข้อมูลนักเรียน ${profiles?.length || 0} คน และบันทึกคะแนน ${scores?.length || 0} รายการ`);

  // 3. กรองเฉพาะ Attempt ที่ 1 สำหรับแต่ละคนและแต่ละประเภทข้อสอบ
  // ในตาราง student_scores: answers JSON อาจมี attempt_number หรือถ้าไม่มีให้เลือกครั้งแรกสุดที่ทำ (created_at asc)
  const firstAttemptMap = new Map<string, { preTest?: any; postTest?: any }>();

  // จัดกลุ่มคะแนนตาม student_id
  scores?.forEach((scoreRecord: any) => {
    const studentId = scoreRecord.student_id;
    if (!studentId) return;

    if (!firstAttemptMap.has(studentId)) {
      firstAttemptMap.set(studentId, {});
    }

    const studentBucket = firstAttemptMap.get(studentId)!;
    const examType = scoreRecord.exam_type;

    // ตรวจสอบ attempt_number จาก JSON answers หรือประวัติแรกสุด
    const attemptNo = scoreRecord.answers?.attempt_number !== undefined 
      ? Number(scoreRecord.answers.attempt_number) 
      : 1;

    if (examType === 'pre-test') {
      // สำหรับ Pre-test หรือเลือก record แรกที่มี attemptNo === 1
      if (!studentBucket.preTest && (attemptNo === 1 || scoreRecord.answers?.attempt_number === undefined)) {
        studentBucket.preTest = scoreRecord;
      }
    } else if (examType === 'post-test') {
      // สำหรับ Post-test คัดเฉพาะ record ครั้งที่ 1 (attempt_number = 1) เท่านั้นสำหรับงานวิจัย
      if (!studentBucket.postTest && (attemptNo === 1 || scoreRecord.answers?.attempt_number === undefined)) {
        studentBucket.postTest = scoreRecord;
      }
    }
  });

  // 4. สร้างข้อมูลตารางสำหรับ SPSS (1 แถว = 1 คน)
  const pairedData: ResearchRow[] = [];
  const completePairsData: ResearchRow[] = [];

  profiles?.forEach((student) => {
    const studentScores = firstAttemptMap.get(student.id);
    const pre = studentScores?.preTest;
    const post = studentScores?.postTest;

    const preScore = pre?.score !== undefined ? Number(pre.score) : null;
    const preTotal = pre?.total_score !== undefined ? Number(pre.total_score) : null;
    const prePercent = preScore !== null && preTotal ? Number(((preScore / preTotal) * 100).toFixed(2)) : null;

    const postScore = post?.score !== undefined ? Number(post.score) : null;
    const postTotal = post?.total_score !== undefined ? Number(post.total_score) : null;
    const postPercent = postScore !== null && postTotal ? Number(((postScore / postTotal) * 100).toFixed(2)) : null;

    const gainScore = (postScore !== null && preScore !== null) 
      ? Number((postScore - preScore).toFixed(2)) 
      : null;

    const gainPercent = (postPercent !== null && prePercent !== null) 
      ? Number((postPercent - prePercent).toFixed(2)) 
      : null;

    const row: ResearchRow = {
      student_id: student.id,
      student_name: student.full_name || 'ไม่ระบุชื่อ',
      email: student.email || '',
      pretest_score: preScore !== null ? preScore : '',
      pretest_total: preTotal !== null ? preTotal : '',
      pretest_percent: prePercent !== null ? prePercent : '',
      posttest_score: postScore !== null ? postScore : '',
      posttest_total: postTotal !== null ? postTotal : '',
      posttest_percent: postPercent !== null ? postPercent : '',
      gain_score: gainScore !== null ? gainScore : '',
      gain_percent: gainPercent !== null ? gainPercent : '',
    };

    pairedData.push(row);

    // เก็บเฉพาะคนที่ทำครบทั้ง Pre-test และ Post-test สำหรับคำนวณ t-test
    if (preScore !== null && postScore !== null) {
      completePairsData.push(row);
    }
  });

  // 5. ส่งออกเป็นไฟล์ Excel (.xlsx)
  const workbook = XLSX.utils.book_new();

  // Sheet 1: ข้อมูลคู่คะแนนทั้งหมด (All Students)
  const sheetAll = XLSX.utils.json_to_sheet(pairedData);
  XLSX.utils.book_append_sheet(workbook, sheetAll, 'ข้อมูลนักเรียนทั้งหมด');

  // Sheet 2: ข้อมูลเฉพาะคนที่ทำครบทั้ง Pre และ Post พร้อมเข้า SPSS (SPSS Ready Paired)
  const sheetPaired = XLSX.utils.json_to_sheet(completePairsData);
  XLSX.utils.book_append_sheet(workbook, sheetPaired, 'SPSS_Paired_Test');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `pretest_posttest_paired_research_${timestamp}.xlsx`;
  const filePath = path.resolve(process.cwd(), fileName);

  XLSX.writeFile(workbook, filePath);

  console.log(`\n✅ บันทึกไฟล์ Excel สำเร็จ: ${filePath}`);
  console.log(`📈 สรุปผลข้อมูลสำหรับงานวิจัย One Group Pretest-Posttest Design:`);
  console.log(`   - จำนวนนักเรียนทั้งหมด: ${pairedData.length} คน`);
  console.log(`   - จำนวนนักเรียนที่มีผลคะแนนครบทั้งคู่ (Pre & Post Attempt 1): ${completePairsData.length} คน`);

  if (completePairsData.length > 0) {
    const avgPre = completePairsData.reduce((acc, r) => acc + Number(r.pretest_score), 0) / completePairsData.length;
    const avgPost = completePairsData.reduce((acc, r) => acc + Number(r.posttest_score), 0) / completePairsData.length;
    const avgGain = completePairsData.reduce((acc, r) => acc + Number(r.gain_score), 0) / completePairsData.length;
    const avgPrePct = completePairsData.reduce((acc, r) => acc + Number(r.pretest_percent), 0) / completePairsData.length;
    const avgPostPct = completePairsData.reduce((acc, r) => acc + Number(r.posttest_percent), 0) / completePairsData.length;

    console.log(`   - คะแนนเฉลี่ยก่อนเรียน (Pre-test Mean): ${avgPre.toFixed(2)} (${avgPrePct.toFixed(2)}%)`);
    console.log(`   - คะแนนเฉลี่ยหลังเรียน (Post-test Mean): ${avgPost.toFixed(2)} (${avgPostPct.toFixed(2)}%)`);
    console.log(`   - คะแนนพัฒนาการเฉลี่ย (Mean Gain Score): +${avgGain.toFixed(2)} (+${(avgPostPct - avgPrePct).toFixed(2)}%)`);
  }
}

exportPretestPosttest().catch(err => {
  console.error('❌ Error executing export script:', err);
});
