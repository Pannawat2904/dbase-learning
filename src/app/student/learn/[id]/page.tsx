"use client";

import { useState, use, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PlayCircle, CheckCircle2, MessageSquareText, Lock, FileText, ChevronDown, MonitorPlay, HelpCircle, ExternalLink, Upload, Sparkles } from "lucide-react";
import { getCourseWithCurriculum, getStudentScores, getStudentProgress } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/client";
import QuizInterface from "@/components/student/QuizInterface";
import AssignmentSubmission from "@/components/student/AssignmentSubmission";

type LessonType = 'slide' | 'video_worksheet' | 'test' | 'quiz' | 'assignment';

interface Lesson {
  id: string | number;
  title: string;
  duration?: string;
  type: LessonType;
  completed?: boolean;
  locked?: boolean;
  content?: any;
}

interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
}

export default function CoursePlayer({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [modules, setModules] = useState<Module[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentScores, setStudentScores] = useState<any[]>([]);
  const [preTestId, setPreTestId] = useState<string | null>(null);
  const [hasCompletedPreTest, setHasCompletedPreTest] = useState(true); // default true until we know it has one
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const supabaseClientRef = useRef<any>(null);
  const getSupabase = () => {
    if (!supabaseClientRef.current) supabaseClientRef.current = createClient();
    return supabaseClientRef.current;
  };

  // Helper: save progress via client-side supabase (works in "use client" components)
  const saveProgress = async (sId: string, cId: string, lId: string) => {
    try {
      const sb = getSupabase();
      
      // Check if already exists
      const { data: existing } = await sb.from('student_lesson_progress')
        .select('id')
        .eq('student_id', sId)
        .eq('lesson_id', lId)
        .maybeSingle();
        
      if (!existing) {
        const { error } = await sb.from('student_lesson_progress').insert({
          student_id: sId,
          course_id: cId,
          lesson_id: lId
        });
        if (error) {
          console.error('saveProgress error:', error.message || error);
          if (error.code === '42501' || error.message?.includes('security policy')) {
            alert('บันทึกข้อมูลไม่สำเร็จ: กรุณารันคำสั่ง SQL ที่แนะนำใน Supabase เพื่อปลดล็อกสิทธิ์ (RLS) ครับ');
          }
        }
      }
    } catch (e: any) {
      console.error('Error saving progress:', e);
    }
  };


  useEffect(() => {
    const fetchCurriculumAndScores = async () => {
      try {
        const data = await getCourseWithCurriculum(unwrappedParams?.id as string);
        if (data) {
          setCourse(data);
          const parsedModules = Array.isArray(data.modules) ? data.modules : JSON.parse(data.modules || '[]');
          setModules(parsedModules);
          
          if (parsedModules.length > 0 && parsedModules[0].lessons?.length > 0) {
            setActiveModuleId(parsedModules[0].id);
            setActiveLessonId(parsedModules[0].lessons[0].id);
          }

          // Check if there's a pre-test in the course
          let foundPreTestId = null;
          for (const mod of parsedModules) {
            for (const les of mod.lessons) {
              const title = (les.title || '').toLowerCase();
              if (les.type === 'test' || les.type === 'quiz') {
                if (title.includes('pre') || title.includes('ก่อนเรียน')) {
                  foundPreTestId = les.id.toString();
                  break;
                }
              }
            }
            if (foundPreTestId) break;
          }

          setPreTestId(foundPreTestId);

          // Get student scores
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            setStudentId(user.id);
            const scores = await getStudentScores(user.id, data.id.toString());
            setStudentScores(scores || []);
            
            // Load progress directly via client-side supabase (server queries.ts won't work in client components)
            const { data: progressData } = await supabase
              .from('student_lesson_progress')
              .select('lesson_id')
              .eq('student_id', user.id)
              .eq('course_id', data.id.toString());
            setCompletedLessons(progressData?.map((p: any) => String(p.lesson_id)) || []);
            
            if (foundPreTestId) {
              const hasScore = scores?.some((s: any) => s.lesson_id === foundPreTestId);
              setHasCompletedPreTest(!!hasScore);
            }
          } else {
            // Dev fallback
            setStudentId("dev-student-123");
            if (foundPreTestId) setHasCompletedPreTest(false);
          }
        }
      } catch (error) {
        console.error("Error fetching course details:", error);
      }
      setLoading(false);
    };
    fetchCurriculumAndScores();
  }, [unwrappedParams?.id]);

  // Mark content lessons as completed automatically
  useEffect(() => {
    if (activeLessonId && studentId && course) {
      const allLessons = modules.flatMap(m => m.lessons || []);
      const lesson = allLessons.find(l => l.id === activeLessonId);
      if (lesson && (lesson.type === 'slide' || lesson.type === 'video_worksheet')) {
        // Save via client-side supabase so it actually persists from a Client Component
        saveProgress(studentId, course.id.toString(), activeLessonId.toString());
        setCompletedLessons(prev => {
          if (!prev.includes(activeLessonId.toString())) {
            return [...prev, activeLessonId.toString()];
          }
          return prev;
        });
      }
    }
  }, [activeLessonId, studentId, course, modules]);

  // Hide AI Chatbot and Bottom Nav during exams to prevent cheating
  useEffect(() => {
    const chatbot = document.getElementById('chatbot-widget');
    const bottomNav = document.getElementById('student-bottom-nav');
    
    if (chatbot || bottomNav) {
      // Find active lesson directly inside effect to ensure latest state
      const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];
      const activeLesson = activeModule?.lessons?.find(l => l.id === activeLessonId) || activeModule?.lessons?.[0];
      
      if (activeLesson && (activeLesson.type === 'test' || activeLesson.type === 'quiz')) {
        if (chatbot) chatbot.style.display = 'none';
        if (bottomNav) bottomNav.style.transform = 'translateY(100%)';
      } else {
        if (chatbot) chatbot.style.display = 'block';
        if (bottomNav) bottomNav.style.transform = 'translateY(0)';
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (chatbot) chatbot.style.display = 'block';
      const bottomNav = document.getElementById('student-bottom-nav');
      if (bottomNav) bottomNav.style.transform = 'translateY(0)';
    };
  }, [activeLessonId, activeModuleId, modules]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-slate-500">กำลังโหลดบทเรียน...</div>;
  }

  if (!course || modules.length === 0) {
    return <div className="h-screen flex items-center justify-center text-red-500">ไม่พบบทเรียนในคอร์สนี้</div>;
  }

  // Helper to get active lesson object
  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];
  const activeLesson = activeModule?.lessons?.find(l => l.id === activeLessonId) || activeModule?.lessons?.[0];

  const allLessons = modules.flatMap(m => m.lessons || []);
  const currentLessonIndex = allLessons.findIndex(l => l.id === activeLessonId);

  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex !== -1 && currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  // Calculate Progress
  const totalLessons = allLessons.length;
  const completedLessonIds = new Set([
    ...completedLessons,
    ...studentScores.filter(s => s.status !== 'pending').map(s => s.lesson_id.toString())
  ]);
  const validCompletedIds = Array.from(completedLessonIds).filter(id => allLessons.some(l => l.id.toString() === id));
  const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((validCompletedIds.length / totalLessons) * 100)) : 0;


  const navigateToLesson = (lessonId: string | number) => {
    // Check if locked due to pre-test
    if (preTestId && !hasCompletedPreTest && lessonId.toString() !== preTestId) {
      alert("กรุณาทำแบบทดสอบก่อนเรียน (Pre-test) ให้เสร็จสิ้นก่อนเข้าสู่บทเรียนถัดไปครับ");
      return;
    }

    const parentModule = modules.find(m => m.lessons?.some(l => l.id === lessonId));
    if (parentModule) {
      setActiveModuleId(parentModule.id);
      setActiveLessonId(lessonId);
    }
  };

  if (!activeLesson) {
    return <div className="h-screen flex items-center justify-center">ไม่พบเนื้อหาบทเรียน</div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6 animate-in fade-in duration-700">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto pr-2 pb-40 md:pb-6 scrollbar-hide">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between mb-4">
          {isExamActive ? (
            <div className="inline-flex items-center text-sm font-medium text-slate-400">
              <ChevronLeft className="w-4 h-4 mr-1" />
              กลับไปหน้ารวมคอร์ส (ระบบล็อคระหว่างสอบ)
            </div>
          ) : (
            <Link href="/student/courses" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
              <ChevronLeft className="w-4 h-4 mr-1" />
              กลับไปหน้ารวมคอร์ส
            </Link>
          )}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden inline-flex items-center text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            สารบัญบทเรียน
          </button>
        </div>

        {/* Lesson Details Header */}
        <div className="mb-6 vision-glass-panel p-6 rounded-2xl flex-shrink-0 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
                {activeModule.title}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-2">
                {activeLesson.title}
              </h1>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => prevLesson && !prevLesson.locked && navigateToLesson(prevLesson.id)}
                disabled={!prevLesson || prevLesson.locked}
                className={`vision-glass px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${
                  !prevLesson || prevLesson.locked 
                    ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500' 
                    : 'text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
              </button>
              <button 
                onClick={() => nextLesson && !nextLesson.locked && navigateToLesson(nextLesson.id)}
                disabled={!nextLesson || nextLesson.locked || isExamActive}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm flex items-center gap-2 transition-all ${
                  !nextLesson || nextLesson.locked || isExamActive
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Content Renderer */}
        <div className="flex-1 min-h-[500px]">
          {activeLesson.type === 'slide' && <SlideViewer key={`slide-${activeLesson.id}`} lesson={activeLesson} />}
          {activeLesson.type === 'video_worksheet' && <VideoWithWorksheet key={`video-${activeLesson.id}`} lesson={activeLesson} />}
          {activeLesson.type === 'assignment' && <AssignmentSubmission key={`assign-${activeLesson.id}`} lesson={activeLesson} courseId={course.id.toString()} />}
          {(activeLesson.type === 'test' || activeLesson.type === 'quiz') && (
            <QuizInterface 
              key={`quiz-${activeLesson.id}`}
              lesson={activeLesson} 
              courseId={course.id.toString()} 
              moduleId={activeModule.id.toString()}
              existingScore={studentScores.find(s => s.lesson_id === activeLesson.id.toString())}
              onExamStart={() => setIsExamActive(true)}
              onExamEnd={() => setIsExamActive(false)}
              onComplete={() => {
                // Save to DB via client-side supabase so green status persists after reload
                if (studentId && course) {
                  saveProgress(studentId, course.id.toString(), activeLesson.id.toString());
                }
                setCompletedLessons(prev => {
                  if (!prev.includes(activeLesson.id.toString())) {
                    return [...prev, activeLesson.id.toString()];
                  }
                  return prev;
                });
                if (activeLesson.id.toString() === preTestId) {
                  setHasCompletedPreTest(true);
                }
                
                // Navigate to next lesson if exists
                if (nextLesson) {
                  const nextModule = modules.find(m => m.lessons?.some(l => l.id === nextLesson.id));
                  if (nextModule) {
                    setActiveModuleId(nextModule.id);
                    setActiveLessonId(nextLesson.id);
                  }
                } else {
                  // No next lesson, go to courses
                  window.location.href = '/student/courses';
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Sidebar (Course Content Accordion) */}
      <div className={`fixed inset-0 z-50 lg:static lg:z-auto bg-slate-900/50 lg:bg-transparent transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'} w-full lg:w-72 xl:w-80 flex-shrink-0 h-full flex flex-col`}>
        <div className={`absolute lg:static right-0 top-0 bottom-0 w-[85vw] sm:w-80 lg:w-full bg-slate-50 dark:bg-slate-900 lg:bg-transparent p-4 lg:p-0 shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} flex flex-col h-full overflow-hidden`}>
          <div className="lg:hidden flex items-center justify-between mb-4 mt-2 px-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">สารบัญบทเรียน</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="vision-glass-panel p-5 h-full flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">เนื้อหาหลักสูตร</h2>
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span>ความก้าวหน้า</span>
              <span className="font-medium text-blue-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
            {modules.map((module) => (
              <div key={module.id} className="border border-slate-200 dark:border-slate-700/50 rounded-2xl bg-white dark:bg-slate-800/20 overflow-hidden transition-all shadow-sm">
                <button 
                  onClick={() => setActiveModuleId(activeModuleId === module.id ? 0 : module.id)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-white text-left text-sm">{module.title}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ml-2 ${activeModuleId === module.id ? 'rotate-180' : ''}`} />
                </button>
                
                <div className={`transition-all duration-300 ease-in-out ${activeModuleId === module.id ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-2 space-y-1">
                    {(module.lessons || []).map((lesson) => {
                      const isLocked = (lesson.locked || (preTestId && !hasCompletedPreTest && lesson.id.toString() !== preTestId));
                      return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          if (isExamActive) {
                            alert('กรุณาทำข้อสอบให้เสร็จสิ้นก่อนเปลี่ยนบทเรียนครับ');
                            return;
                          }
                          if (!isLocked) {
                            setActiveLessonId(lesson.id);
                            setActiveModuleId(module.id);
                            setIsSidebarOpen(false); // Close sidebar on mobile after selection
                          }
                        }}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left ${
                          activeLessonId === lesson.id 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50' 
                            : completedLessonIds.has(lesson.id.toString())
                              ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                              : isLocked || isExamActive
                                ? 'opacity-60 cursor-not-allowed border border-transparent' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 border border-transparent'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {completedLessonIds.has(lesson.id.toString()) ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : isLocked || (isExamActive && activeLessonId !== lesson.id) ? (
                            <Lock className="w-4 h-4 text-slate-400" />
                          ) : lesson.type === 'slide' ? (
                            <FileText className="w-4 h-4 text-blue-500" />
                          ) : lesson.type === 'video_worksheet' ? (
                            <PlayCircle className="w-4 h-4 text-indigo-500" />
                          ) : lesson.type === 'assignment' ? (
                            <Upload className="w-4 h-4 text-purple-500" />
                          ) : (
                            <HelpCircle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${activeLessonId === lesson.id ? 'font-semibold text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'} line-clamp-2 leading-tight`}>
                            {lesson.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            {lesson.type === 'slide' ? <FileText className="w-3 h-3 text-slate-400" /> :
                             lesson.type === 'video_worksheet' ? <PlayCircle className="w-3 h-3 text-slate-400" /> :
                             lesson.type === 'assignment' ? <Upload className="w-3 h-3 text-slate-400" /> :
                             <HelpCircle className="w-3 h-3 text-slate-400" />}
                            <span>
                              {lesson.duration} • {
                                lesson.type === 'video_worksheet' ? 'วิดีโอ+ใบงาน' : 
                                lesson.type === 'assignment' ? 'งานปฏิบัติ' :
                                (lesson.type === 'test' || lesson.type === 'quiz') ? 'แบบทดสอบ' : 
                                'สไลด์ทฤษฎี'
                              }
                            </span>
                          </p>
                        </div>
                      </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>

    </div>
  );
}

// --- Dynamic Content Components ---

function SlideViewer({ lesson }: { lesson: Lesson }) {
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    if (url.includes("canva.com/design/")) {
      let canvaUrl = url;
      if (canvaUrl.includes("/edit")) {
        canvaUrl = canvaUrl.replace("/edit", "/view");
      }
      if (!canvaUrl.includes("embed")) {
        canvaUrl = canvaUrl.includes("?") ? `${canvaUrl}&embed` : `${canvaUrl}?embed`;
      }
      return canvaUrl;
    }
    return url;
  };

  const pdfUrl = lesson.content?.pdfUrl;

  if (pdfUrl) {
    return (
      <div className="w-full h-full min-h-[500px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <iframe src={getEmbedUrl(pdfUrl)} className="w-full h-full min-h-[500px]" title="Slide Content" allowFullScreen></iframe>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5"></div>
      <FileText className="w-20 h-20 text-blue-500 dark:text-blue-400 mb-6 drop-shadow-sm opacity-50" />
      <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">สื่อนำเสนอ (Slide)</h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-md px-4">
        ยังไม่มีเนื้อหาสไลด์สำหรับบทเรียนนี้
      </p>
    </div>
  );
}

function VideoWithWorksheet({ lesson }: { lesson: Lesson }) {
  const [activeTab, setActiveTab] = useState<'video' | 'worksheet'>('video');
  const youtubeUrl = lesson.content?.youtubeUrl;
  const worksheetUrl = lesson.content?.worksheetUrl;

  const match = youtubeUrl?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : youtubeUrl || '';

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {activeTab === 'video' ? (
        <>
          <div className="w-full flex-1 min-h-[400px] xl:min-h-[600px] rounded-3xl bg-slate-950 shadow-md relative overflow-hidden flex items-center justify-center">
            {youtubeUrl ? (
              <iframe 
                width="100%" 
                height="100%" 
                src={embedUrl} 
                title="YouTube Video"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="absolute inset-0"
              ></iframe>
            ) : (
              <div className="text-slate-500 flex flex-col items-center">
                <MonitorPlay className="w-16 h-16 mb-4 opacity-50" />
                <p>ยังไม่มีวิดีโอสำหรับบทเรียนนี้</p>
              </div>
            )}
          </div>
          {worksheetUrl && (
            <div className="flex justify-end mt-2 animate-in fade-in">
              <button 
                onClick={() => setActiveTab('worksheet')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2"
              >
                ถัดไป: ทำใบงาน <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="w-full flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">ใบงานสำหรับบทเรียนนี้</h2>
          <p className="text-slate-500 mb-8 max-w-md">คุณครูได้เตรียมใบงานไว้ในรูปแบบของฟอร์มออนไลน์ ให้นักเรียนกดปุ่มด้านล่างเพื่อเข้าไปทำใบงานและส่งคำตอบได้เลยครับ</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => setActiveTab('video')}
              className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 justify-center"
            >
              <ChevronLeft className="w-5 h-5" /> กลับไปดูวิดีโอ
            </button>
            <a 
              href={worksheetUrl} 
              target="_blank" 
              rel="noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2 justify-center"
            >
              เปิดใบงานออนไลน์ <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// QuizInterface has been extracted to @/components/student/QuizInterface
