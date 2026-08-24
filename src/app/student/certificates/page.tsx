import { GraduationCap, Award, ExternalLink, CalendarDays, Lock, Sparkles } from "lucide-react";
import { createClient } from '@/utils/supabase/server';
import { getCertificates } from "@/utils/supabase/queries";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function CertificatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let earnedCertificates: any[] = [];
  let allModules: any[] = [];
  
  // Fetch all modules to show as available certificates
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, course_id, courses(title)')
    .order('order_index', { ascending: true });
    
  if (modules) {
    allModules = modules;
  }

  if (user) {
    earnedCertificates = await getCertificates(user.id);

    // Auto-issue recovery check
    try {
      const { data: postTestScores } = await supabase
        .from('student_scores')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (postTestScores && postTestScores.length > 0 && allModules.length > 0) {
        for (const mod of allModules) {
          const alreadyEarned = earnedCertificates.some(
            cert => String(cert.module_id) === String(mod.id) || String(cert.course_id) === String(mod.course_id)
          );

          if (!alreadyEarned) {
            const passedPostTest = postTestScores.some(s => {
              const matchesCourse = String(s.course_id) === String(mod.course_id);
              const isPost = s.exam_type === 'post-test' || (s.exam_type === 'quiz' && Number(s.score) >= Number(s.total_score || 1) * 0.5);
              const percentage = s.total_score > 0 ? (s.score / s.total_score) * 100 : 0;
              return matchesCourse && isPost && percentage >= 50;
            });

            if (passedPostTest) {
              const { data: newCert } = await supabase
                .from('certificates')
                .insert([{
                  student_id: user.id,
                  course_id: mod.course_id,
                  module_id: mod.id
                }])
                .select(`
                  *,
                  course:courses (title, instructor),
                  module:modules (title)
                `)
                .single();

              if (newCert) {
                earnedCertificates.push(newCert);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Auto-certificate recovery check:", err);
    }
  }

  // Map modules with earned certificates
  const certificateItems = allModules.map(module => {
    const earned = earnedCertificates.find(cert => 
      String(cert.module_id) === String(module.id) || 
      (String(cert.course_id) === String(module.course_id))
    );
    return {
      module,
      earned,
    };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-sm font-bold mb-3">
            <Award className="w-4 h-4" /> แฟ้มสะสมผลงาน
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            ใบประกาศนียบัตร (Certificates)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl text-sm md:text-base">
            เกียรติบัตรทั้งหมดในระบบ เรียนจบแต่ละบทเรียนและสอบผ่านเกณฑ์เพื่อรับเกียรติบัตรลายจิบิสุดน่ารักได้ทันที
          </p>
        </div>
      </div>

      {allModules.length === 0 ? (
        <div className="vision-glass p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <GraduationCap className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">ยังไม่มีบทเรียนในระบบ</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificateItems.map((item, idx) => {
            const isEarned = !!item.earned;
            // Alternate male teacher database artwork for earned certificates
            const teacherEarnedImg = idx % 2 === 0 
              ? '/images/certificates/teacher_cert_1.jpg' 
              : '/images/certificates/teacher_cert_2.jpg';
            const teacherLockedImg = '/images/certificates/teacher_cert_locked.jpg';
            
            return (
              <div 
                key={item.module.id} 
                className={`vision-glass p-6 group transition-all duration-300 rounded-3xl border ${
                  isEarned 
                    ? 'hover:-translate-y-1.5 hover:shadow-xl border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-b from-white/90 via-white/80 to-amber-50/30 dark:from-slate-900/90 dark:to-amber-950/20' 
                    : 'opacity-90 hover:opacity-100 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Modern Teacher Cover Image Container */}
                <div className={`aspect-[1.33] rounded-2xl mb-5 relative overflow-hidden flex items-center justify-center transition-all duration-500 border-2 shadow-sm ${
                  isEarned 
                    ? 'border-amber-300/80 dark:border-amber-700/60 shadow-amber-500/10 group-hover:shadow-lg' 
                    : 'border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800'
                }`}>
                  <img 
                    src={isEarned ? teacherEarnedImg : teacherLockedImg} 
                    alt={item.module.title}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                      !isEarned ? 'brightness-[0.7] contrast-[0.95]' : ''
                    }`}
                  />

                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 ${
                    isEarned 
                      ? 'bg-gradient-to-t from-black/50 via-transparent to-transparent' 
                      : 'bg-slate-900/40 backdrop-blur-[2px]'
                  }`}></div>

                  {/* Status Overlay Badge */}
                  {isEarned ? (
                    <>
                      <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500/90 backdrop-blur-md text-white rounded-full text-xs font-extrabold shadow-lg flex items-center gap-1.5 border border-amber-300/40 animate-in fade-in zoom-in">
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>ได้รับเกียรติบัตรแล้ว</span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="text-[11px] font-semibold text-amber-200 drop-shadow uppercase tracking-wider">
                          Certificate of Achievement
                        </p>
                        <p className="text-sm font-bold text-white drop-shadow truncate">
                          {item.module.title}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform">
                        <Lock className="w-6 h-6 text-white drop-shadow" />
                      </div>
                      <span className="text-xs font-extrabold tracking-wider px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 shadow-sm">
                        ยังไม่ปลดล็อก
                      </span>
                    </div>
                  )}
                </div>
                
                <h3 className={`font-bold text-lg mb-1.5 line-clamp-2 ${isEarned ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {item.module.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">
                  วิชา: {item.module.courses?.title || 'หลักสูตรโปรแกรมฐานข้อมูล'}
                </p>
                
                {isEarned ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-5">
                      <CalendarDays className="w-4 h-4 text-amber-500" />
                      <span>ได้รับเมื่อ: {format(new Date(item.earned.issued_at), 'd MMMM yyyy', { locale: th })}</span>
                    </div>
                    <Link 
                      href={`/student/certificates/${item.earned.id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <span>ดูใบประกาศนียบัตร</span>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-5">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>เรียนและสอบผ่านเพื่อปลดล็อก</span>
                    </div>
                    <Link 
                      href={`/student/learn/${item.module.course_id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-colors"
                    >
                      <span>ไปเรียนเพื่อรับเกียรติบัตร</span>
                    </Link>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
