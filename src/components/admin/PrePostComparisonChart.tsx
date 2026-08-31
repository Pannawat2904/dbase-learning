"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from "recharts";
import { TrendingUp, TrendingDown, BookOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface ChartData {
  name: string;
  ก่อนเรียน: number;
  หลังเรียน: number;
}

export default function PrePostComparisonChart({ courseId }: { courseId?: number }) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgPre: 0,
    avgPost: 0,
    improvement: 0,
    studentsCount: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        
        // Fetch modules and lessons
        let modulesQuery = supabase
          .from('modules')
          .select(`
            id,
            title,
            course_id,
            lessons (id, title, type)
          `);
          
        if (courseId) {
          modulesQuery = modulesQuery.eq('course_id', courseId);
        }

        const { data: modules } = await modulesQuery;
        if (!modules) return;

        // Fetch scores
        const lessonIds = modules.flatMap(m => m.lessons.map(l => l.id));
        if (lessonIds.length === 0) return;

        const { data: scores } = await supabase
          .from('student_scores')
          .select('student_id, score, total_score, lesson_id, created_at')
          .in('lesson_id', lessonIds);
          
        if (!scores) return;

        const chartData: ChartData[] = [];
        let totalImprovementSum = 0;
        let validModulesCount = 0;
        const allUniqueStudents = new Set<string>();

        modules.forEach(module => {
          const testLessons = module.lessons.filter(l => l.type === 'test');
          if (testLessons.length === 0) return;

          const studentPreScores = new Map<string, { totalScore: number, maxScore: number }>();
          const studentPostScores = new Map<string, { totalScore: number, maxScore: number }>();

          testLessons.forEach(lesson => {
            const isPre = lesson.title.includes('ก่อนเรียน');
            const isPost = lesson.title.includes('หลังเรียน');
            if (!isPre && !isPost) return;

            const lessonScores = scores.filter(s => s.lesson_id === lesson.id);
            
            lessonScores.forEach(score => {
              const sid = score.student_id;
              allUniqueStudents.add(sid);
              const targetMap = isPre ? studentPreScores : studentPostScores;
              const current = targetMap.get(sid) || { totalScore: 0, maxScore: 0 };
              
              targetMap.set(sid, {
                totalScore: current.totalScore + Number(score.score || 0),
                maxScore: current.maxScore + Number(score.total_score || 1)
              });
            });
          });

          // Calculate averages for this module
          let sumPrePercent = 0;
          let countPre = 0;
          studentPreScores.forEach(val => {
            if (val.maxScore > 0) {
              sumPrePercent += (val.totalScore / val.maxScore) * 100;
              countPre++;
            }
          });

          let sumPostPercent = 0;
          let countPost = 0;
          studentPostScores.forEach(val => {
            if (val.maxScore > 0) {
              sumPostPercent += (val.totalScore / val.maxScore) * 100;
              countPost++;
            }
          });

          const avgPre = countPre > 0 ? sumPrePercent / countPre : 0;
          const avgPost = countPost > 0 ? sumPostPercent / countPost : 0;

          // Simplify module title (e.g. "บทที่ 6: การสร้างฟอร์ม" -> "บทที่ 6")
          let shortName = module.title;
          const match = module.title.match(/^(บทที่\s*\d+|บทเรียนที่\s*\d+)/);
          if (match) {
            shortName = match[1];
          }

          if (countPre > 0 || countPost > 0) {
            chartData.push({
              name: shortName,
              ก่อนเรียน: Number(avgPre.toFixed(1)),
              หลังเรียน: Number(avgPost.toFixed(1))
            });
            totalImprovementSum += (avgPost - avgPre);
            validModulesCount++;
          }
        });

        setData(chartData);

        const avgImprovement = validModulesCount > 0 ? totalImprovementSum / validModulesCount : 0;

        setStats({
          avgPre: 0, // not used in global stats UI right now
          avgPost: 0,
          improvement: Number(avgImprovement.toFixed(1)),
          studentsCount: allUniqueStudents.size
        });

      } catch (error) {
        console.error("Error fetching pre/post data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm w-full animate-pulse h-[300px]">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg mb-8"></div>
        <div className="h-full w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm w-full flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            เปรียบเทียบคะแนนก่อน-หลังเรียน
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            คะแนนเฉลี่ยคิดเป็นเปอร์เซ็นต์ จากนักเรียน {stats.studentsCount} คน
          </p>
        </div>
        
        {stats.studentsCount > 0 && (
          <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-sm font-bold ${
            stats.improvement > 0 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30' 
              : stats.improvement < 0 
                ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-800/30'
                : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            {stats.improvement > 0 ? <TrendingUp className="w-4 h-4" /> : stats.improvement < 0 ? <TrendingDown className="w-4 h-4" /> : null}
            {stats.improvement > 0 ? '+' : ''}{stats.improvement}% พัฒนาการ
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[250px] w-full">
        {stats.studentsCount === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <BarChart className="w-12 h-12 mb-2 opacity-20" />
            <p>ยังไม่มีข้อมูลคะแนนสอบ</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
              barSize={80}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b' }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${value}%`, 'คะแนนเฉลี่ย']}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="ก่อนเรียน" fill="#94a3b8" radius={[6, 6, 0, 0]} name="ก่อนเรียน" />
              <Bar dataKey="หลังเรียน" fill="#3b82f6" radius={[6, 6, 0, 0]} name="หลังเรียน" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
