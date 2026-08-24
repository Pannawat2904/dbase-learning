"use client";

import { useEffect, useState } from "react";
import { Users, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface AtRiskStudent {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  lastActive: Date | null;
  daysInactive: number;
  averageScore: number;
  riskReasons: string[];
}

export default function AtRiskStudents() {
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAtRiskStudents = async () => {
      try {
        const supabase = createClient();
        
        // Fetch all students
        const { data: students } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .eq('role', 'student');

        if (!students) return;

        // Fetch progress to determine last active date
        const { data: progress } = await supabase
          .from('student_lesson_progress')
          .select('student_id, created_at')
          .order('created_at', { ascending: false });

        // Fetch scores to determine academic risk (filter out survey scores)
        const { data: scores } = await supabase
          .from('student_scores')
          .select('student_id, score, total_score, created_at, exam_type')
          .in('exam_type', ['quiz', 'pre-test', 'post-test']);

        const now = new Date();
        const riskList: AtRiskStudent[] = [];

        students.forEach(student => {
          const reasons: string[] = [];
          
          // Check inactivity
          const studentProgress = progress?.filter(p => p.student_id === student.id);
          const studentScores = scores?.filter(s => s.student_id === student.id);
          
          let lastActive: Date | null = null;
          let daysInactive = 999;
          
          const allDates: number[] = [];
          if (studentProgress && studentProgress.length > 0) {
            allDates.push(new Date(studentProgress[0].created_at).getTime());
          }
          if (studentScores && studentScores.length > 0) {
            studentScores.forEach(s => allDates.push(new Date(s.created_at).getTime()));
          }
          
          if (allDates.length > 0) {
            lastActive = new Date(Math.max(...allDates));
            const diffTime = Math.abs(now.getTime() - lastActive.getTime());
            daysInactive = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          if (daysInactive >= 7) {
            reasons.push(lastActive ? `ขาดเรียน ${daysInactive} วัน` : 'ยังไม่เคยเข้าเรียน');
          }

          // Check scores
          let averageScore = 100;
          
          if (studentScores && studentScores.length > 0) {
            let totalPercentage = 0;
            studentScores.forEach(s => {
              totalPercentage += (s.score / s.total_score) * 100;
            });
            averageScore = Math.round(totalPercentage / studentScores.length);
            
            if (averageScore < 50) {
              reasons.push(`คะแนนเฉลี่ยต่ำ (${averageScore}%)`);
            }
          }

          if (reasons.length > 0) {
            riskList.push({
              id: student.id,
              name: student.full_name || 'ไม่ระบุชื่อ',
              email: student.email,
              avatar_url: student.avatar_url,
              lastActive,
              daysInactive,
              averageScore,
              riskReasons: reasons
            });
          }
        });

        // Sort by most at risk (highest days inactive or lowest score)
        riskList.sort((a, b) => b.riskReasons.length - a.riskReasons.length);
        
        if (isMounted) {
          setAtRiskStudents(riskList.slice(0, 5)); // Show top 5
        }
        
      } catch (e) {
        console.error("Error fetching at-risk students:", e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAtRiskStudents();

    // Poll for updates every 5 seconds to keep data real-time
    const interval = setInterval(() => {
      fetchAtRiskStudents();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full p-6 animate-pulse space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-5 w-24 bg-slate-100 dark:bg-slate-800/60 rounded-full"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                </div>
              </div>
              <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (atRiskStudents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm w-full text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">นักเรียนทุกคนอยู่ในเกณฑ์ดี</h3>
        <p className="text-sm text-slate-500">ไม่มีนักเรียนที่ขาดเรียนนานหรือคะแนนต่ำกว่าเกณฑ์</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            นักเรียนกลุ่มเสี่ยง
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            นักเรียนที่ขาดเรียนเกิน 7 วัน หรือคะแนนเฉลี่ยต่ำกว่า 50%
          </p>
        </div>
      </div>
      
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {atRiskStudents.map((student) => (
          <Link href={`/admin/students`} key={student.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
              {student.avatar_url ? (
                <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                  {student.name.charAt(0)}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{student.name}</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {student.riskReasons.map((reason, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="text-right shrink-0">
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
      
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <Link href="/admin/students" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 w-full p-2">
          ดูนักเรียนทั้งหมด
        </Link>
      </div>
    </div>
  );
}
