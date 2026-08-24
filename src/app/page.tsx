import Link from "next/link";
import { BookOpen, Sparkles, BrainCircuit, LineChart, ChevronRight, Play, User, Database, Server } from "lucide-react";
import { getSettings } from "@/utils/supabase/queries";

export default async function Home() {
  const settings = await getSettings();
  const instructorName = settings?.admin_name ? (settings.admin_name.startsWith('ครู') || settings.admin_name.startsWith('อ.') ? settings.admin_name : `ครู${settings.admin_name}`) : 'ครูปาณวัฐ รักรอดจิต';

  return (
    <main className="relative min-h-screen flex flex-col pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Animated Gradient Background */}
      <div className="vision-bg"></div>

      {/* Teacher Login Button (Top Right) */}
      <div className="absolute top-6 right-6 sm:right-8 z-50 animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
        <Link href="/admin/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md rounded-full border border-slate-200/50 dark:border-slate-700/50 transition-all shadow-sm hover:shadow">
          <User className="w-4 h-4" />
          สำหรับครูผู้สอน
        </Link>
      </div>

      <div className="max-w-7xl mx-auto w-full z-10 space-y-16">
        
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-10">
          <div className="space-y-8 text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/50 dark:bg-blue-900/30 text-sm font-medium text-blue-700 dark:text-blue-300 shadow-sm mb-4 border border-blue-200 dark:border-blue-800 transform transition hover:scale-105">
              <Database className="w-4 h-4 text-blue-600" />
              <span>เรียนรู้ระบบฐานข้อมูลอย่างมืออาชีพ</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.4]">
              ระบบเรียนรู้วิชาโปรแกรมฐานข้อมูลอัจฉริยะ <br className="hidden sm:block"/>
              <span className="text-gradient">DBASE Learning AI</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0">
              ยกระดับการเรียนวิชาโปรแกรมฐานข้อมูล (21910-2012) ด้วย AI ผู้ช่วยสอนส่วนตัว 
              เรียนรู้ไว เข้าใจง่าย พร้อมตอบทุกข้อสงสัย 24 ชั่วโมง
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Link href="/student/dashboard" className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-blue-600 rounded-full overflow-hidden shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto">
                <span className="relative z-10 flex items-center gap-2">
                  เริ่มต้นเรียนรู้ <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              
              <Link href="/preview" className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 dark:text-white bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-full border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto shadow-sm">
                <Play className="w-5 h-5 text-blue-600 fill-blue-600/20" />
                ดูพรีวิวเนื้อหา
              </Link>
            </div>
          </div>
          
          {/* Hero Image / Textbook Cover */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-sm animate-in zoom-in duration-1000 delay-200 px-4 sm:px-8 lg:px-0 mt-8 lg:mt-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full blur-[100px] opacity-30 dark:opacity-20 animate-pulse"></div>
            
            <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-slate-700 transform lg:rotate-3 hover:rotate-0 transition-transform duration-500 hover:scale-105 bg-white aspect-[3/4] flex flex-col group">
              
              {/* Background Image */}
              <div className="absolute inset-0 pt-20 bg-white">
                <img src="/images/book_cover_v2.png" alt="Database Programming Cover" className="w-full h-full object-cover object-top opacity-95 group-hover:scale-105 transition-transform duration-700" />
              </div>
              
              {/* Modern subtle accent lines instead of thick basic stripes */}
              <div className="absolute top-28 left-0 right-0 h-16 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm z-0 border-y border-white/20"></div>
              
              {/* Overlay Gradient for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-white/60 dark:to-slate-900/80 z-10"></div>
              
              <div className="relative z-20 flex flex-col h-full p-6">
                {/* Header (Course Code) */}
                <div className="text-right">
                  <span className="text-blue-700 dark:text-blue-300 font-bold text-sm sm:text-base tracking-widest bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-white/50">
                    รหัสวิชา 21910-2012
                  </span>
                </div>
                
                {/* Title */}
                <div className="mt-8 text-center sm:text-left">
                  <div className="inline-block bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/50 shadow-xl">
                    <h2 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-blue-900 to-indigo-700 dark:from-white dark:to-blue-200 leading-tight tracking-tight">
                      โปรแกรมฐานข้อมูล
                    </h2>
                    <h3 className="text-lg sm:text-xl font-bold text-blue-800/80 dark:text-blue-300/80 mt-1 tracking-wide">
                      (Database Program)
                    </h3>
                  </div>
                </div>
                
                <div className="flex-1"></div>
                
                {/* Bottom - Author */}
                <div className="mt-auto self-start bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-tr-3xl rounded-bl-lg shadow-lg border border-white/20 -ml-6 -mb-6">
                  <span className="text-lg font-semibold tracking-wide flex items-center gap-2">
                    <User className="w-4 h-4 opacity-80" /> {instructorName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento Card 1 - AI Tutor (Large) */}
            <div className="md:col-span-2 min-h-[250px] vision-glass-panel vision-glass-hoverable p-8 flex flex-col justify-between group rounded-3xl overflow-hidden">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                  <BrainCircuit className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">AI ผู้ช่วยสอน 24 ชม.</h3>
                <p className="text-slate-600 dark:text-slate-300 text-lg max-w-md">
                  ปรึกษาและไขข้อสงสัยเรื่องฐานข้อมูล ER-Diagram หรือโค้ด SQL ได้ทันทีผ่าน AI แชทบอทสุดฉลาด
                </p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity transform translate-x-1/4 translate-y-1/4">
                <BrainCircuit className="w-64 h-64 text-blue-600" />
              </div>
            </div>

            {/* Bento Card 2 - Step by Step */}
            <div className="min-h-[250px] vision-glass-panel vision-glass-hoverable p-8 flex flex-col justify-between group rounded-3xl overflow-hidden">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-inner">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">บทเรียนและแบบทดสอบ</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  เนื้อหาครอบคลุมวิชาโปรแกรมฐานข้อมูล พร้อมแบบทดสอบเพื่อวัดความเข้าใจของคุณ
                </p>
              </div>
            </div>

            {/* Bento Card 3 - Analytics */}
            <div className="md:col-span-3 min-h-[250px] vision-glass-panel vision-glass-hoverable p-8 flex flex-col md:flex-row items-center justify-between gap-8 group rounded-3xl overflow-hidden">
              <div className="space-y-4 max-w-xl">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                  <LineChart className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">ติดตามความคืบหน้าแบบ Real-time</h3>
                <p className="text-slate-600 dark:text-slate-300 text-lg">
                  ดูผลคะแนนและเปอร์เซ็นต์การเรียนรู้ของคุณผ่านแดชบอร์ดที่สรุปผลได้ชัดเจนและเข้าใจง่าย
                </p>
              </div>
              <div className="w-full md:w-1/3 h-32 rounded-xl bg-gradient-to-r from-blue-100/50 to-indigo-100/50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-white/20 flex items-end justify-between p-4 overflow-hidden relative">
                {/* Decorative Chart Bars */}
                <div className="w-1/6 bg-blue-400/80 h-[40%] rounded-t-sm"></div>
                <div className="w-1/6 bg-sky-400/80 h-[70%] rounded-t-sm"></div>
                <div className="w-1/6 bg-indigo-400/80 h-[50%] rounded-t-sm"></div>
                <div className="w-1/6 bg-blue-500/80 h-[90%] rounded-t-sm"></div>
                <div className="w-1/6 bg-sky-500/80 h-[100%] rounded-t-sm"></div>
              </div>
            </div>
            
          </div>
        </section>
      </div>
    </main>
  );
}
