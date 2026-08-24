"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, Clock, Wifi, Play, Sparkles, BookOpen } from "lucide-react";
import ExamEvaluationChart from "@/components/student/ExamEvaluationChart";
import Link from "next/link";

interface Module {
  id: number;
  title: string;
  lessons: { id: string | number; type: string }[];
}

interface RealtimeDashboardProps {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  modules: Module[];
  allCoursesModules?: { courseId: string; modules: Module[] }[];
  initialCompletedIds: string[];
  scoresData: any[];
}

export default function RealtimeDashboard({
  userId,
  courseId,
  courseTitle,
  courseDescription,
  modules,
  allCoursesModules,
  initialCompletedIds,
  scoresData,
}: RealtimeDashboardProps) {
  const [completedIds, setCompletedIds] = useState<string[]>(initialCompletedIds);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Local progress for the current viewed course (Main Card & Module List)
  const totalModules = modules.length;
  const completedModulesCount = modules.filter(module => {
    const moduleLessons = module.lessons || [];
    if (moduleLessons.length === 0) return false;
    return moduleLessons.every(l => completedIds.includes(l.id.toString()));
  }).length;

  const progressPct = totalModules > 0 ? Math.min(100, Math.round((completedModulesCount / totalModules) * 100)) : 0;
  const isCourseCompleted = progressPct >= 100;
  
  // Global progress for Realtime Stats Sidebar
  const allGlobalLessons = allCoursesModules 
    ? allCoursesModules.flatMap(c => c.modules.flatMap(m => m.lessons || []))
    : modules.flatMap((m) => m.lessons || []);

  const completedCount = completedIds.filter((id) => allGlobalLessons.some((l) => l.id.toString() === id)).length;
  const studyHours = Math.floor((completedCount * 20) / 60);
  const studyMins = (completedCount * 20) % 60;

  let globalCompletedCourses = 0;
  let globalTotalModules = 0;
  let globalCompletedModulesCount = 0;

  if (allCoursesModules) {
    globalCompletedCourses = allCoursesModules.filter(c => {
      const courseTotalLessons = c.modules.flatMap(m => m.lessons || []);
      if (courseTotalLessons.length === 0) return false;
      return courseTotalLessons.every(l => completedIds.includes(l.id.toString()));
    }).length;

    const allModules = allCoursesModules.flatMap(c => c.modules);
    globalTotalModules = allModules.length;
    globalCompletedModulesCount = allModules.filter(module => {
      const moduleLessons = module.lessons || [];
      if (moduleLessons.length === 0) return false;
      return moduleLessons.every(l => completedIds.includes(l.id.toString()));
    }).length;
  } else {
    globalCompletedCourses = isCourseCompleted ? 1 : 0;
    globalTotalModules = totalModules;
    globalCompletedModulesCount = completedModulesCount;
  }

  const globalProgressPct = globalTotalModules > 0 
    ? Math.min(100, Math.round((globalCompletedModulesCount / globalTotalModules) * 100)) 
    : 0;

  const refreshProgress = useCallback(async () => {
    const supabase = createClient();
    // Fetch global progress (progress + scores + assignments)
    const [pRes, sRes, aRes] = await Promise.all([
      supabase.from("student_lesson_progress").select("lesson_id").eq("student_id", userId),
      supabase.from("student_scores").select("lesson_id, score, total_score, exam_type, status").eq("student_id", userId),
      supabase.from("student_assignments").select("lesson_id").eq("student_id", userId)
    ]);

    const failedPostTestIds = new Set<string>();
    const passedScoresIds: string[] = [];

    (sRes.data || []).forEach((s: any) => {
      const lid = String(s.lesson_id);
      const isPost = s.exam_type === 'post-test';
      const pct = s.total_score > 0 ? (s.score / s.total_score) * 100 : 0;
      if (isPost) {
        if (pct >= 50 && s.status !== 'pending') {
          passedScoresIds.push(lid);
        } else {
          failedPostTestIds.add(lid);
        }
      } else {
        if (s.status !== 'pending') {
          passedScoresIds.push(lid);
        }
      }
    });

    const combinedSet = new Set([
      ...(pRes.data || []).map(p => String(p.lesson_id)).filter(id => !failedPostTestIds.has(id)),
      ...passedScoresIds,
      ...(aRes.data || []).map(a => String(a.lesson_id)),
    ].filter(Boolean));

    setCompletedIds(Array.from(combinedSet));
    setLastUpdated(new Date());
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    refreshProgress();

    // Listen to all progress changes for this student globally
    const channel = supabase
      .channel(`progress:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_lesson_progress",
        },
        (payload: any) => {
          if (payload?.new?.student_id === userId || payload?.old?.student_id === userId) {
            refreshProgress();
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshProgress();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(refreshProgress, 8000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [userId, refreshProgress]);

  // Scores logic
  let preTestScore = 0;
  let postTestScore = 0;
  let preTestTotal = 0;
  let postTestTotal = 0;
  let hasScores = false;
  
  if (scoresData && scoresData.length > 0) {
    hasScores = true;
    const preTest = scoresData.find((s: any) => s.exam_type === 'pre-test') || scoresData[0];
    const postTest = scoresData.find((s: any) => s.exam_type === 'post-test') || (scoresData.length > 1 ? scoresData[scoresData.length - 1] : null);
    
    preTestScore = preTest?.score || 0;
    preTestTotal = preTest?.total_score || preTestScore || 0;
    postTestScore = postTest ? (postTest.score || 0) : 0;
    postTestTotal = postTest ? (postTest.total_score || postTestScore || 0) : 0;
  }

  const chartData = [
    { name: 'แบบทดสอบก่อนเรียน', score: preTestScore, fullScore: preTestTotal, fill: '#94a3b8' },
    { name: 'แบบทดสอบหลังเรียน', score: postTestScore, fullScore: postTestTotal, fill: '#3b82f6' },
  ];
  
  let growthPercentage = 0;
  const preTestPct = preTestTotal > 0 ? (preTestScore / preTestTotal) * 100 : 0;
  const postTestPct = postTestTotal > 0 ? (postTestScore / postTestTotal) * 100 : 0;
  if (preTestPct > 0 && postTestPct > 0) {
    growthPercentage = Math.round(postTestPct - preTestPct);
  } else if (postTestScore > 0) {
    growthPercentage = Math.round(postTestPct);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content (Left 2 columns) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* BIGGER Continue Learning Card */}
        <div className="vision-glass p-8 md:p-10 relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/20 rounded-full filter blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
          
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                {courseId ? (isCourseCompleted ? 'เรียนจบแล้ว 🎓' : 'กำลังเรียนอยู่ 📖') : 'ไม่มีคอร์ส'}
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                isLive
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                <Wifi className="w-3.5 h-3.5" />
                {isLive ? "LIVE" : "กำลังเชื่อมต่อ..."}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="w-full md:w-48 h-40 md:h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-lg relative overflow-hidden flex-shrink-0 group">
                <img 
                  src={
                    (courseTitle?.includes('6') || courseTitle?.includes('ฟอร์ม')) 
                      ? "/images/cover_chapter6.png" 
                      : (courseTitle?.includes('7') || courseTitle?.includes('รายงาน'))
                      ? "/images/cover_chapter7.png"
                      : "/images/course_cover.png"
                  } 
                  alt="Course Cover" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
              </div>
              
              <div className="flex-1 w-full space-y-5">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">{courseTitle || 'ยังไม่มีคอร์สในระบบ'}</h2>
                  {courseDescription && (
                    <p className="text-slate-500 text-base mt-2">{courseDescription}</p>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-base font-semibold">
                    <span className="text-slate-600 dark:text-slate-300">ความก้าวหน้ารวม</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">{progressPct}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>
                </div>
                
                {courseId && (
                  <Link href={`/student/learn/${courseId}`} className="inline-flex mt-2 items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/25 font-bold text-lg">
                    <Play className="w-5 h-5 fill-current" />
                    {progressPct > 0 ? 'เรียนต่อเลย' : 'เริ่มเรียน'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Exam Evaluation Section */}
        <div className="vision-glass p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full filter blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">ผลการประเมินการเรียนรู้</h3>
              <p className="text-base text-slate-500 mt-1">เปรียบเทียบคะแนนสอบก่อนและหลังเรียนเรียลไทม์</p>
            </div>
            <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-full border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
              {hasScores ? (growthPercentage > 0 ? `+${growthPercentage}% พัฒนาการดีเยี่ยม 📈` : `${growthPercentage}%`) : "ยังไม่มีข้อมูลการสอบ"}
            </div>
          </div>

          <div className="h-72">
            <ExamEvaluationChart data={chartData} />
          </div>
        </div>

      </div>

      {/* Sidebar (Right 1 column) */}
      <div className="space-y-6">
        
        {/* Realtime Stats Widget */}
        <div className="vision-glass p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">สถิติการเรียนเรียลไทม์</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">เวลาเรียนประเมิน</p>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white">
                  {studyHours}<span className="text-sm font-semibold text-slate-500 ml-1">ชม.</span>{" "}
                  {studyMins}<span className="text-sm font-semibold text-slate-500 ml-1">นาที</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${
                globalCompletedCourses > 0
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              }`}>
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">จบคอร์สแล้ว</p>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white">
                  {globalCompletedCourses}<span className="text-sm font-semibold text-slate-500 ml-1">คอร์ส</span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">
                <span>บทที่เรียนจบแล้ว</span>
                <span className="font-bold text-slate-800 dark:text-white">{globalCompletedModulesCount}/{globalTotalModules}</span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    globalProgressPct >= 100 ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${globalProgressPct}%` }}
                />
              </div>
              {globalProgressPct >= 100 && globalTotalModules > 0 && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold mt-3 text-center">
                  🎓 เรียนครบทุกบทเรียนแล้ว!
                </p>
              )}
            </div>

            {lastUpdated && (
              <p className="text-xs text-slate-400 text-right mt-2">
                อัปเดต: {lastUpdated.toLocaleTimeString("th-TH")}
              </p>
            )}
          </div>
        </div>

        {/* Per-module progress realtime */}
        <div className="vision-glass p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-5">ความคืบหน้ารายบทเรียน</h3>
          <div className="space-y-5">
            {modules.length > 0 ? modules.map((module, idx) => {
              const moduleLessons = module.lessons || [];
              const moduleTotal = moduleLessons.length;
              const moduleCompletedCount = moduleLessons.filter((l) =>
                completedIds.includes(l.id.toString())
              ).length;
              const modulePct = moduleTotal > 0 ? Math.round((moduleCompletedCount / moduleTotal) * 100) : 0;
              const moduleCompleted = modulePct === 100;

              return (
                <div key={module.id || idx} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    moduleCompleted
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : modulePct > 0
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}>
                    {moduleCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {module.title}
                      </span>
                      <span className={`text-sm font-bold ml-2 flex-shrink-0 ${
                        moduleCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                      }`}>
                        {moduleCompletedCount}/{moduleTotal}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          moduleCompleted ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${modulePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="text-slate-500 text-sm">ยังไม่มีเนื้อหาบทเรียน</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="vision-glass p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-5">กิจกรรมล่าสุด</h3>
          <div className="space-y-4">
            {scoresData && scoresData.length > 0 ? (
              scoresData.slice(-3).reverse().map((score: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-sm flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {score.exam_type === 'pre-test' ? 'สอบก่อนเรียน' : 'สอบหลังเรียน'}
                    </span>
                  </div>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                    {score.score}/{score.total_score ?? score.score} คะแนน
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500 py-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">ยังไม่มีกิจกรรมล่าสุด</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
