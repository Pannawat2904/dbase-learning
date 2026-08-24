import { GraduationCap, Award, ExternalLink, CalendarDays, Lock } from "lucide-react";
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
  
  if (user) {
    earnedCertificates = await getCertificates(user.id);
  }
  
  // Fetch all modules to show as available certificates
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, course_id, courses(title)')
    .order('order_index', { ascending: true });
    
  if (modules) {
    allModules = modules;
  }

  // Map modules with earned certificates
  const certificateItems = allModules.map(module => {
    const earned = earnedCertificates.find(cert => cert.module_id === module.id);
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
            เกียรติบัตรทั้งหมดในระบบ เรียนจบแต่ละบทเรียนและสอบผ่านเพื่อรับเกียรติบัตรได้ทันที
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
          {certificateItems.map((item) => {
            const isEarned = !!item.earned;
            
            return (
              <div key={item.module.id} className={`vision-glass p-6 group transition-all duration-300 ${isEarned ? 'hover:-translate-y-1' : 'opacity-80 hover:opacity-100'}`}>
                <div className={`aspect-[1.414] rounded-xl mb-6 relative overflow-hidden flex items-center justify-center transition-shadow border-4 ${isEarned ? 'bg-slate-100 dark:bg-slate-800 group-hover:shadow-lg border-white dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                  {isEarned ? (
                    <>
                      <Award className="w-20 h-20 text-amber-500/20" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent"></div>
                    </>
                  ) : (
                    <Lock className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                
                <h3 className={`font-bold text-lg mb-2 line-clamp-2 ${isEarned ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {item.module.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-1">
                  วิชา: {item.module.courses?.title || 'หลักสูตรทั่วไป'}
                </p>
                
                {isEarned ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                      <CalendarDays className="w-4 h-4" />
                      <span>ได้รับเมื่อ: {format(new Date(item.earned.issued_at), 'd MMMM yyyy', { locale: th })}</span>
                    </div>
                    <Link 
                      href={`/student/certificates/${item.earned.id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-medium rounded-xl transition-colors"
                    >
                      ดูใบประกาศนียบัตร <ExternalLink className="w-4 h-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                      <Lock className="w-4 h-4" />
                      <span>ยังไม่ได้รับเกียรติบัตร</span>
                    </div>
                    <Link 
                      href={`/student/learn/${item.module.course_id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl transition-colors"
                    >
                      ไปเรียนเพื่อรับเกียรติบัตร
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
