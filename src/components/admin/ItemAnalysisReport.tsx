"use client";

import { useEffect, useState } from "react";
import { BarChart3, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, Info, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface QuestionStat {
  id: string;
  lessonId: string | number;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  text: string;
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
  p: number; // Difficulty index (0.00 - 1.00)
  pStatus: "easy" | "good" | "hard";
  pLabel: string;
  r: number; // Discrimination index (-1.00 to 1.00)
  rStatus: "very-good" | "good" | "acceptable" | "poor";
  rLabel: string;
  isAcceptable: boolean;
  isHard: boolean;
}

interface ItemAnalysisReportProps {
  courseId?: number;
}

export default function ItemAnalysisReport({ courseId }: ItemAnalysisReportProps) {
  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "quality" | "needs-revision">("all");
  const [testPhase, setTestPhase] = useState<"all" | "pre" | "post">("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const supabase = createClient();
        
        // 1. Fetch courses, modules, and lessons
        let query = supabase.from('courses').select(`
          id, 
          title, 
          modules (
            id,
            lessons (
              id,
              title,
              type,
              content
            )
          )
        `);
        if (courseId) {
          query = query.eq('id', courseId);
        }
        const { data: courses } = await query;
        if (!courses) return;

        // Map questions: questionId -> Question Metadata
        const allQuestions = new Map<string, any>();
        // Map lessons: lessonId -> Question IDs list
        const lessonQuestionsMap = new Map<string, string[]>();

        courses.forEach((course: any) => {
          if (course.modules && Array.isArray(course.modules)) {
            course.modules.forEach((module: any) => {
              if (module.lessons && Array.isArray(module.lessons)) {
                module.lessons.forEach((lesson: any) => {
                  if (lesson.type === 'quiz' || lesson.type === 'test') {
                    let contentObj = lesson.content;
                    if (typeof contentObj === 'string') {
                      try { contentObj = JSON.parse(contentObj); } catch (e) {}
                    }
                    if (contentObj?.questions && Array.isArray(contentObj.questions)) {
                      const qIds: string[] = [];
                      contentObj.questions.forEach((q: any) => {
                        const qKey = String(q.id);
                        qIds.push(qKey);
                        allQuestions.set(qKey, {
                          ...q,
                          lessonId: lesson.id,
                          lessonTitle: lesson.title || 'แบบทดสอบ',
                          moduleTitle: module.title || 'บทเรียน',
                          courseTitle: course.title || 'หลักสูตร'
                        });
                      });
                      lessonQuestionsMap.set(String(lesson.id), qIds);
                    }
                  }
                });
              }
            });
          }
        });

        // 2. Fetch student scores for item analysis
        let scoresQuery = supabase.from('student_scores').select('id, student_id, score, total_score, answers, lesson_id, exam_type, created_at');
        if (courseId) {
          scoresQuery = scoresQuery.eq('course_id', courseId);
        }
        const { data: scores } = await scoresQuery;
        
        if (!scores || scores.length === 0) {
          setLoading(false);
          return;
        }

        // Group scores by lesson_id to calculate 27% High-Low Discrimination (r) per exam
        const lessonScoresMap = new Map<string, any[]>();
        scores.forEach((sRecord: any) => {
          const lId = String(sRecord.lesson_id);
          if (!lessonScoresMap.has(lId)) {
            lessonScoresMap.set(lId, []);
          }
          lessonScoresMap.get(lId)!.push(sRecord);
        });

        // Map for question statistics: questionId -> stats
        const questionStats = new Map<string, { total: number; correct: number; r: number }>();

        // Calculate Discrimination (r) and Difficulty (p) per exam
        lessonScoresMap.forEach((examSubmissions, lId) => {
          const qIdsInLesson = lessonQuestionsMap.get(lId) || [];
          if (qIdsInLesson.length === 0 || examSubmissions.length === 0) return;

          // Parse answers
          const parsedSubmissions = examSubmissions.map(sub => {
            let answersObj = sub.answers;
            if (typeof answersObj === 'string') {
              try { answersObj = JSON.parse(answersObj); } catch (e) {}
            }
            return {
              student_id: sub.student_id,
              score: Number(sub.score || 0),
              total_score: Number(sub.total_score || 1),
              answers: answersObj || {}
            };
          });

          // Sort submissions by total score descending for 27% group division
          parsedSubmissions.sort((a, b) => b.score - a.score);
          const N = parsedSubmissions.length;
          // 27% group size: if N >= 4, use round(N * 0.27), else floor(N / 2) with minimum 1
          const groupSize = N >= 4 ? Math.max(1, Math.round(N * 0.27)) : Math.max(1, Math.floor(N / 2));
          const highGroup = parsedSubmissions.slice(0, groupSize);
          const lowGroup = parsedSubmissions.slice(N - groupSize, N);

          qIdsInLesson.forEach(qId => {
            const qData = allQuestions.get(qId);
            if (!qData || qData.type !== 'multiple-choice') return;

            // Count total correct
            let total = 0;
            let correct = 0;
            parsedSubmissions.forEach(sub => {
              const studentAnswer = sub.answers[qId];
              if (studentAnswer !== undefined && studentAnswer !== null) {
                total += 1;
                if (String(studentAnswer) === String(qData.correctOptionIndex)) {
                  correct += 1;
                }
              }
            });

            // Count high group correct (RH) and low group correct (RL)
            let highCorrect = 0;
            highGroup.forEach(sub => {
              const ans = sub.answers[qId];
              if (String(ans) === String(qData.correctOptionIndex)) {
                highCorrect += 1;
              }
            });

            let lowCorrect = 0;
            lowGroup.forEach(sub => {
              const ans = sub.answers[qId];
              if (String(ans) === String(qData.correctOptionIndex)) {
                lowCorrect += 1;
              }
            });

            // Discrimination index r = (RH - RL) / groupSize
            const rVal = groupSize > 0 ? (highCorrect - lowCorrect) / groupSize : 0;
            questionStats.set(qId, {
              total,
              correct,
              r: Number(rVal.toFixed(2))
            });
          });
        });

        const finalStats: QuestionStat[] = [];
        questionStats.forEach((stat, qId) => {
          const qData = allQuestions.get(qId);
          if (qData && stat.total > 0) {
            const pVal = Number((stat.correct / stat.total).toFixed(2));
            const successRate = Math.round(pVal * 100);

            // Difficulty Interpretation (p)
            let pStatus: "easy" | "good" | "hard" = "good";
            let pLabel = "เหมาะสม (0.20 - 0.80)";
            if (pVal > 0.80) {
              pStatus = "easy";
              pLabel = "ง่ายเกินไป (> 0.80)";
            } else if (pVal < 0.20) {
              pStatus = "hard";
              pLabel = "ยากเกินไป (< 0.20)";
            }

            // Discrimination Interpretation (r)
            let rStatus: "very-good" | "good" | "acceptable" | "poor" = "poor";
            let rLabel = "ควรปรับปรุง (< 0.20)";
            if (stat.r >= 0.40) {
              rStatus = "very-good";
              rLabel = "จำแนกได้ดีมาก (≥ 0.40)";
            } else if (stat.r >= 0.30) {
              rStatus = "good";
              rLabel = "จำแนกได้ดี (0.30 - 0.39)";
            } else if (stat.r >= 0.20) {
              rStatus = "acceptable";
              rLabel = "พอใช้/ยอมรับได้ (0.20 - 0.29)";
            }

            const isAcceptable = (pVal >= 0.20 && pVal <= 0.80) && (stat.r >= 0.20);

            finalStats.push({
              id: qId,
              lessonId: qData.lessonId,
              lessonTitle: qData.lessonTitle,
              moduleTitle: qData.moduleTitle,
              courseTitle: qData.courseTitle,
              text: qData.text || 'ไม่มีโจทย์ข้อความ',
              totalAttempts: stat.total,
              correctAttempts: stat.correct,
              successRate,
              p: pVal,
              pStatus,
              pLabel,
              r: stat.r,
              rStatus,
              rLabel,
              isAcceptable,
              isHard: pVal < 0.20 || successRate < 50
            });
          }
        });

        // Sort by discrimination and difficulty
        finalStats.sort((a, b) => a.r - b.r);
        setStats(finalStats);
        
      } catch (e) {
        console.error("Error fetching item analysis:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [courseId]);

  const handleExportXLSX = () => {
    if (stats.length === 0) return;
    setIsExporting(true);
    try {
      const exportRows = stats.map((s, idx) => ({
        "ข้อที่": idx + 1,
        "คำถาม (Item Text)": s.text.replace(/<[^>]*>?/gm, ''),
        "ชุดบทเรียน/ข้อสอบ": s.lessonTitle,
        "รายวิชา": s.courseTitle,
        "จำนวนผู้ตอบ (N)": s.totalAttempts,
        "จำนวนตอบถูก (R)": s.correctAttempts,
        "ค่าความยาก (p)": s.p,
        "แปลผลค่าความยาก": s.pLabel,
        "ค่าอำนาจจำแนก (r)": s.r,
        "แปลผลค่าอำนาจจำแนก": s.rLabel,
        "สรุปคุณภาพข้อสอบ": s.isAcceptable ? "คุณภาพดี (นำไปใช้ได้)" : "ควรปรับปรุงข้อสอบ"
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Item_Analysis_Report");

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `รายงานวิเคราะห์ข้อสอบ_Item_Analysis_${timestamp}.xlsx`);
      toast.success("ดาวน์โหลดรายงานวิเคราะห์ข้อสอบ (Excel) เรียบร้อยแล้ว");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลด Excel");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm w-full animate-pulse space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-9 w-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm w-full text-center">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">ยังไม่มีข้อมูลวิเคราะห์ข้อสอบ</h3>
        <p className="text-sm text-slate-500">รอให้นักเรียนทำแบบทดสอบเพื่อดูการวิเคราะห์ความยากง่าย (p) และอำนาจจำแนก (r)</p>
      </div>
    );
  }

  const availableModules = Array.from(new Set(stats.map(s => s.moduleTitle))).sort();

  const moduleStats = stats.filter(s => {
    if (moduleFilter !== "all" && s.moduleTitle !== moduleFilter) return false;
    return true;
  });

  const phaseStats = moduleStats.filter(s => {
    if (testPhase === "pre") return s.lessonTitle.includes("ก่อนเรียน");
    if (testPhase === "post") return s.lessonTitle.includes("หลังเรียน");
    return true;
  });

  const filteredStats = phaseStats.filter(s => {
    if (filterType === "quality") return s.isAcceptable;
    if (filterType === "needs-revision") return !s.isAcceptable;
    return true;
  });

  const displayStats = expanded ? filteredStats : filteredStats.slice(0, 4);
  const needsRevisionCount = phaseStats.filter(s => !s.isAcceptable).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              การวิเคราะห์คุณภาพข้อสอบ (Item Analysis)
            </h2>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold">
              {moduleStats.length} ข้อ
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            คำนวณค่าความยากง่าย (p) และค่าอำนาจจำแนก (r) ด้วยวิธี 27% กลุ่มสูง-กลุ่มต่ำ ตามมาตรฐานงานวิจัย
          </p>
        </div>

        <div className="flex items-center gap-2">
          {needsRevisionCount > 0 && (
            <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold flex items-center gap-1 border border-amber-200 dark:border-amber-800/40">
              <AlertTriangle className="w-3.5 h-3.5" />
              ควรปรับปรุง {needsRevisionCount} ข้อ
            </div>
          )}
          <button
            onClick={handleExportXLSX}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? "กำลังส่งออก..." : "Export Excel (.xlsx)"}
          </button>
        </div>
      </div>

      {/* Filter Tabs & Measurement Formula Note */}
      <div className="bg-slate-50/70 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-xs">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <span className="text-slate-500 font-medium">เลือกบทเรียน:</span>
              <div className="relative">
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700"
                >
                  <option value="all">ทุกบทเรียน</option>
                  {availableModules.map(m => {
                    let shortName = m;
                    const match = m.match(/^(บทที่\s*\d+|บทเรียนที่\s*\d+)/);
                    if (match) shortName = match[1];
                    return <option key={m} value={m}>{shortName}</option>
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl w-fit">
              <button
              onClick={() => { setTestPhase("all"); setFilterType("all"); }}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${testPhase === "all" ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => { setTestPhase("pre"); setFilterType("all"); }}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${testPhase === "pre" ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              ก่อนเรียน
            </button>
            <button
              onClick={() => { setTestPhase("post"); setFilterType("all"); }}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${testPhase === "post" ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              หลังเรียน
            </button>
          </div>
          </div>
          
          {/* Quality Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${filterType === "all" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-800"}`}
            >
              ทั้งหมด ({phaseStats.length})
            </button>
            <button
              onClick={() => setFilterType("quality")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${filterType === "quality" ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-800"}`}
            >
              คุณภาพดี ({phaseStats.filter(s => s.isAcceptable).length})
            </button>
            <button
              onClick={() => setFilterType("needs-revision")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${filterType === "needs-revision" ? "bg-white dark:bg-slate-800 text-red-600 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-800"}`}
            >
              ควรปรับปรุง ({needsRevisionCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-500" /> เกณฑ์: p = 0.20-0.80 | r ≥ 0.20
          </span>
        </div>
      </div>
      
      {/* Items List */}
      <div className="p-6">
        <div className="space-y-4">
          {displayStats.map((stat, idx) => (
            <div 
              key={stat.id} 
              className={`p-4 rounded-xl border transition-all ${
                stat.isAcceptable 
                  ? 'bg-slate-50/50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700' 
                  : 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
              }`}
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                
                {/* Question Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                      ข้อที่ {idx + 1}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      {stat.moduleTitle} - {stat.lessonTitle}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                    <span dangerouslySetInnerHTML={{ __html: stat.text }} />
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> ตอบถูก {stat.correctAttempts}/{stat.totalAttempts} คน ({stat.successRate}%)
                    </span>
                  </div>
                </div>
                
                {/* Metrics Badges: p & r */}
                <div className="flex items-center gap-3 shrink-0">
                  
                  {/* Difficulty (p) */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center min-w-[110px]">
                    <div className="text-xs text-slate-400 mb-0.5">ค่าความยาก (p)</div>
                    <div className={`text-base font-bold ${stat.pStatus === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {stat.p.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {stat.pStatus === 'good' ? 'เหมาะสม' : stat.pStatus === 'easy' ? 'ง่ายเกินไป' : 'ยากเกินไป'}
                    </div>
                  </div>

                  {/* Discrimination (r) */}
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center min-w-[110px]">
                    <div className="text-xs text-slate-400 mb-0.5">อำนาจจำแนก (r)</div>
                    <div className={`text-base font-bold ${stat.r >= 0.20 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                      {stat.r.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {stat.r >= 0.30 ? 'จำแนกได้ดี' : stat.r >= 0.20 ? 'พอใช้' : 'ควรปรับปรุง'}
                    </div>
                  </div>

                  {/* Summary Status Pill */}
                  <div className="min-w-[120px] text-right">
                    {stat.isAcceptable ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-3.5 h-3.5" /> คุณภาพดี
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <XCircle className="w-3.5 h-3.5" /> ควรปรับปรุง
                      </span>
                    )}
                  </div>

                </div>
              </div>
              
              {/* Progress bar visual */}
              <div className="mt-3 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${stat.isAcceptable ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, Math.max(5, stat.successRate))}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredStats.length > 4 && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center justify-center gap-1 transition-colors"
          >
            {expanded ? (
              <>ย่อให้สั้นลง <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>ดูทั้งหมด ({filteredStats.length} ข้อ) <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

