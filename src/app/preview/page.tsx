import Link from 'next/link'
import { Database, Lock, Play, Search, Sparkles, ArrowLeft, FileText, Code2, ShieldCheck, ChevronRight, BookOpen } from 'lucide-react'
import { getCourses, getCourseWithCurriculum } from '@/utils/supabase/queries'

export default async function PreviewPage() {
  const courses = await getCourses();
  
  let previewModules: any[] = [];
  let globalLessonCount = 1;
  
  if (courses && courses.length > 0) {
    // Reversing to make it chronological (assuming older courses are earlier chapters)
    const chronologicalCourses = [...courses].reverse();
    
    // Fetch details for all courses
    const courseDetails = await Promise.all(
      chronologicalCourses.map(course => getCourseWithCurriculum(course.id.toString()))
    );

    courseDetails.forEach(courseDetail => {
      if (courseDetail && courseDetail.modules) {
        // Sort modules by order_index just in case
        const sortedModules = [...courseDetail.modules].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

        const mappedModules = sortedModules.map((mod: any) => {
          const lessons = (mod.lessons || []).map((lesson: any) => {
            let icon = Database;
            if (lesson.type === 'slide') icon = FileText;
            if (lesson.type === 'video_worksheet') icon = Play;
            if (lesson.type === 'test' || lesson.type === 'quiz') icon = ShieldCheck;
            if (lesson.type === 'assignment') icon = Code2;
            
            const isFirstLesson = globalLessonCount === 1;
            const mappedLesson = {
              id: globalLessonCount,
              realId: lesson.id,
              title: lesson.title,
              duration: lesson.duration || '15 นาที',
              locked: !isFirstLesson, // Only unlock the very first lesson of the entire curriculum
              icon: icon
            };
            globalLessonCount++;
            return mappedLesson;
          });

          return {
            id: mod.id,
            title: mod.title, // Assuming mod.title has the chapter name like "บทที่ 6..."
            lessons: lessons
          };
        });
        
        previewModules = [...previewModules, ...mappedModules];
      }
    });
  }

  // Fallback if no modules found
  if (previewModules.length === 0) {
    previewModules = [
      {
        id: 1,
        title: 'บทที่ 1: ระบบฐานข้อมูลเบื้องต้น',
        lessons: [
          { id: 1, realId: 1, title: 'ความหมายและองค์ประกอบของระบบฐานข้อมูล', duration: '15 นาที', locked: false, icon: Database },
          { id: 2, realId: 2, title: 'การจำลองข้อมูลด้วย Entity-Relationship Model', duration: '30 นาที', locked: true, icon: FileText },
        ]
      }
    ];
  }

  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden selection:bg-blue-500/30">
      
      {/* Elegant Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 dark:opacity-5"></div>
      </div>

      <div className="relative z-10 pt-8 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
        
        {/* Top Navigation */}
        <nav className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
          
          <div className="px-4 py-1.5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              Course Preview
            </span>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center mx-auto shadow-sm">
            <Database className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.35] sm:leading-[1.25]">
              วิชาโปรแกรมฐานข้อมูล <br/>
              <span className="text-blue-600 dark:text-blue-400">
                DBASE Learning AI
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
              สำรวจเนื้อหาและทดลองเรียนในวิชาโปรแกรมฐานข้อมูล (21910-2012) เพื่อสัมผัสประสบการณ์การเรียนรู้ด้วย AI ผู้ช่วยส่วนตัว
            </p>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 transition-all">
            <div className="pl-4 pr-2">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="ค้นหาชื่อบทเรียนที่คุณสนใจ..." 
              disabled
              className="w-full bg-transparent border-none py-2.5 pr-4 text-slate-700 dark:text-slate-200 focus:outline-none placeholder-slate-400 cursor-not-allowed"
            />
            <div className="pr-2">
              <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                ⌘ K
              </span>
            </div>
          </div>
        </div>

        {/* Lesson List as Multiple Module Cards */}
        <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          {previewModules.map((module) => (
            <div key={module.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">เนื้อหาตัวอย่าง</span>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {module.title}
                  </h2>
                </div>
              </div>

              <div className="space-y-2">
                {module.lessons.map((lesson: any) => (
                  <div 
                    key={lesson.id} 
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                  >
                    <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${lesson.locked ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'}`}>
                          {lesson.locked ? <Lock className="w-4 h-4" /> : <lesson.icon className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className={`font-medium ${lesson.locked ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {lesson.title}
                          </h3>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <span className="font-semibold">Lesson {lesson.id}</span>
                            <span>•</span>
                            <span>{lesson.duration}</span>
                          </div>
                        </div>
                    </div>
                    
                    <div className="sm:pl-14 flex shrink-0">
                        {lesson.locked ? (
                          <Link href="/login" className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> ล็อกอิน
                          </Link>
                        ) : (
                          <Link href="/login" className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                            <Play className="w-3.5 h-3.5 fill-current" /> ทดลองเรียน
                          </Link>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Simple CTA */}
        <div className="relative text-center pt-16 pb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-lg">
            
            <Sparkles className="w-8 h-8 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3">
              พร้อมที่จะเริ่มเรียนรู้แล้วหรือยัง?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm md:text-base">
              ปลดล็อกเนื้อหาทั้งหมดและเข้าถึง AI Tutor ส่วนตัวที่จะช่วยตอบทุกคำถามของคุณตลอด 24 ชั่วโมง
            </p>
            
            <Link href="/login" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity shadow-md">
              เข้าสู่ระบบตอนนี้
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </main>
  )
}
