import { Award, Clock, BookOpen, Settings, Edit3, ShieldCheck, Download, User } from "lucide-react";
import { createClient } from '@/utils/supabase/server';
import { getCertificates, getStudentScores } from '@/utils/supabase/queries';
import Link from "next/link";
import LogoutButton from "@/components/student/LogoutButton";

export default async function StudentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = { full_name: "นักเรียน (Student)", avatar_url: "" };
  let email = user?.email || "student@example.com";
  let totalXP = 0;
  let totalHours = 0;
  let certificates: any[] = [];
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) profile = data;

    // Fetch real data
    certificates = await getCertificates(user.id);
    const scores = await getStudentScores(user.id);
    totalXP = scores.reduce((sum: number, s: any) => sum + (s.score || 0), 0) * 10;
    
    // Fetch total completed lessons for hours calculation
    const { data: progress } = await supabase.from('student_progress').select('id').eq('student_id', user.id);
    const completedLessons = progress?.length || 0;
    totalHours = Math.round((completedLessons * 0.5) * 10) / 10; // Assume 30 mins per lesson
  }

  // Get initials for fallback avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'St';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Profile Header */}
      <div className="vision-glass p-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -z-10"></div>
        
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-1 shadow-xl">
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 border-4 border-white/50 dark:border-slate-800/50 flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                  {getInitials(profile.full_name)}
                </span>
              )}
            </div>
          </div>
          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2 border border-emerald-200/50 dark:border-emerald-700/50">
            <ShieldCheck className="w-3.5 h-3.5" /> นักเรียนระดับ 3
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">{profile.full_name}</h1>
          <p className="text-slate-500">{email}</p>
        </div>

        <div className="flex gap-2">
          <button className="vision-glass p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/40">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="vision-glass p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-slate-500">ชั่วโมงเรียนสะสม</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalHours} <span className="text-sm font-normal text-slate-500">ชม.</span></p>
          </div>
        </div>

        <div className="vision-glass p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-slate-500">คอร์สที่จบแล้ว</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{certificates.length} <span className="text-sm font-normal text-slate-500">คอร์ส/บทเรียน</span></p>
          </div>
        </div>

        <div className="vision-glass p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-slate-500">คะแนนสะสม (XP)</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalXP} <span className="text-sm font-normal text-slate-500">XP</span></p>
          </div>
        </div>
      </div>

      {/* Certificates Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <Award className="w-6 h-6 text-amber-500" /> ใบรับรองความสำเร็จ (Certificates)
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {certificates.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>ยังไม่มีใบรับรองความสำเร็จ</p>
              <p className="text-sm mt-1">เรียนและทำแบบทดสอบให้ผ่านเพื่อรับใบรับรอง</p>
            </div>
          ) : (
            certificates.map((cert: any, index: number) => {
              const isFirst = index % 2 === 0;
              const date = new Date(cert.issued_at).toLocaleDateString('th-TH', {
                year: 'numeric', month: 'long', day: 'numeric'
              });
              
              const teacherThumb = index % 2 === 0 ? '/images/certificates/teacher_cert_1.jpg' : '/images/certificates/teacher_cert_2.jpg';
              return (
                <div key={cert.id} className="vision-glass-panel shimmer p-1 relative overflow-hidden group rounded-3xl">
                  <div className={`absolute inset-0 bg-gradient-to-br ${isFirst ? 'from-amber-200/20 via-yellow-100/10' : 'from-blue-200/20 via-sky-100/10'} to-transparent z-0`}></div>
                  <div className="relative z-10 bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-2xl p-5 h-full flex flex-col md:flex-row items-center md:items-start gap-5">
                    
                    {/* Teacher Cover Avatar */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-amber-300 dark:border-amber-700/60 shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform duration-500 relative">
                      <img 
                        src={teacherThumb} 
                        alt="Certificate Cover"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left flex flex-col h-full">
                      <p className={`text-xs font-bold ${isFirst ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'} uppercase tracking-widest mb-1`}>
                        Certificate of Achievement
                      </p>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white mb-1.5">
                        {cert.module?.title || cert.course?.title || "หลักสูตรสำเร็จ"}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mb-4 flex-1">
                        มอบให้เพื่อแสดงว่าได้ผ่านการทดสอบและสำเร็จหลักสูตรเมื่อวันที่ {date}
                      </p>
                      <Link href={`/student/certificates/${cert.id}`} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all w-fit mx-auto md:mx-0 shadow-sm ${
                        isFirst 
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                      }`}>
                        <span>ดูใบประกาศนียบัตร</span>
                        <Award className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Mobile Logout Button */}
      <LogoutButton />
    </div>
  );
}
