"use client";

import { useEffect, useState } from "react";
import { BarChart3, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface QuestionStat {
  id: string;
  text: string;
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
  isHard: boolean;
}

interface ItemAnalysisReportProps {
  courseId?: number;
}

export default function ItemAnalysisReport({ courseId }: ItemAnalysisReportProps) {
  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const supabase = createClient();
        
        // Fetch all courses to get modules and lessons if courseId is not provided
        let query = supabase.from('courses').select(`
          id, 
          title, 
          modules (
            id,
            lessons (
              id,
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

        // Extract all questions from all quizzes
        const allQuestions = new Map<string, any>();
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
                      contentObj.questions.forEach((q: any) => {
                        allQuestions.set(q.id, { ...q, lessonId: lesson.id, courseTitle: course.title });
                      });
                    }
                  }
                });
              }
            });
          }
        });

        // Fetch student scores
        let scoresQuery = supabase.from('student_scores').select('answers, lesson_id');
        if (courseId) {
          scoresQuery = scoresQuery.eq('course_id', courseId);
        }
        const { data: scores } = await scoresQuery;
        
        if (!scores) {
          setLoading(false);
          return;
        }

        // Calculate stats
        const questionStats = new Map<string, { total: number; correct: number }>();
        
        scores.forEach(scoreRecord => {
          let answersObj = scoreRecord.answers;
          if (typeof answersObj === 'string') {
            try { answersObj = JSON.parse(answersObj); } catch (e) {}
          }
          if (answersObj && typeof answersObj === 'object') {
            Object.entries(answersObj).forEach(([qId, studentAnswer]) => {
              const qData = allQuestions.get(qId);
              if (qData && qData.type === 'multiple-choice') {
                const currentStat = questionStats.get(qId) || { total: 0, correct: 0 };
                currentStat.total += 1;
                // Parse correctly depending on how answers are saved (string or number)
                if (String(studentAnswer) === String(qData.correctOptionIndex)) {
                  currentStat.correct += 1;
                }
                questionStats.set(qId, currentStat);
              }
            });
          }
        });

        const finalStats: QuestionStat[] = [];
        questionStats.forEach((stat, qId) => {
          const qData = allQuestions.get(qId);
          if (qData && stat.total > 0) {
            const successRate = Math.round((stat.correct / stat.total) * 100);
            finalStats.push({
              id: qId,
              text: qData.text || 'ไม่มีโจทย์ข้อความ',
              totalAttempts: stat.total,
              correctAttempts: stat.correct,
              successRate,
              isHard: successRate < 50
            });
          }
        });

        // Sort by success rate (lowest first) to highlight hard questions
        finalStats.sort((a, b) => a.successRate - b.successRate);
        setStats(finalStats);
        
      } catch (e) {
        console.error("Error fetching item analysis:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [courseId]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full"></div>;
  }

  if (stats.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm w-full text-center">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">ยังไม่มีข้อมูลวิเคราะห์ข้อสอบ</h3>
        <p className="text-sm text-slate-500">รอให้นักเรียนทำแบบทดสอบเพื่อดูการวิเคราะห์ความยากง่ายของโจทย์</p>
      </div>
    );
  }

  const hardQuestions = stats.filter(s => s.isHard);
  const displayStats = expanded ? stats : stats.slice(0, 3);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            วิเคราะห์ข้อสอบ
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            ข้อสอบไหนที่นักเรียนทำผิดเยอะ เพื่อนำไปปรับปรุงการสอน
          </p>
        </div>
        {hardQuestions.length > 0 && (
          <div className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            มีข้อที่ต้องทบทวน {hardQuestions.length} ข้อ
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {displayStats.map((stat, idx) => (
            <div key={stat.id} className={`p-4 rounded-xl border ${stat.isHard ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'} transition-colors`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                    <span className="text-slate-400 mr-2">ข้อที่ {idx + 1}.</span>
                    <span dangerouslySetInnerHTML={{ __html: stat.text }} />
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> ตอบถูก {stat.correctAttempts}/{stat.totalAttempts} คน
                    </span>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <div className={`text-xl font-bold ${stat.isHard ? 'text-red-600' : 'text-emerald-600'}`}>
                    {stat.successRate}%
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">สำเร็จ</div>
                </div>
              </div>
              
              <div className="mt-3 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${stat.isHard ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${stat.successRate}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        {stats.length > 3 && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center justify-center gap-1 transition-colors"
          >
            {expanded ? (
              <>ย่อให้สั้นลง <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>ดูทั้งหมด ({stats.length} ข้อ) <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
