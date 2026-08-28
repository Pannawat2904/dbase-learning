"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, Clock, ChevronRight, CheckCircle, User } from "lucide-react";
import { getCourses } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/client";

export default function CourseCatalog() {
  const [activeTab, setActiveTab] = useState("all");
  const [courses, setCourses] = useState<any[]>([]);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  
  // New state for search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("latest");

  useEffect(() => {
    async function fetchData() {
      const data = await getCourses(true);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [pRes, sRes, aRes] = await Promise.all([
          supabase.from('student_lesson_progress').select('lesson_id').eq('student_id', user.id),
          supabase.from('student_scores').select('lesson_id, score, total_score, exam_type, status').eq('student_id', user.id).neq('exam_type', 'access_log'),
          supabase.from('student_assignments').select('lesson_id').eq('student_id', user.id)
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

        const combined = new Set([
          ...(pRes.data || []).map((p: any) => String(p.lesson_id)).filter(id => !failedPostTestIds.has(id)),
          ...passedScoresIds,
          ...(aRes.data || []).map((a: any) => String(a.lesson_id))
        ].filter(Boolean));

        setCompletedLessonIds(Array.from(combined));
      }
      setCourses(data || []);
      
      const { getAdminUsers } = await import("@/utils/supabase/queries");
      const admins = await getAdminUsers();
      const adminWithAvatar = admins.find(a => a.avatar_url);
      if (adminWithAvatar) {
        setAdminAvatar(adminWithAvatar.avatar_url);
      }
    }
    fetchData();
  }, []);

  const tabs = [
    { id: "all", name: "ทั้งหมด" },
    { id: "basic", name: "พื้นฐาน", levelName: "พื้นฐาน" },
    { id: "advanced", name: "ขั้นสูง", levelName: "ขั้นสูง" },
    { id: "project", name: "โปรเจกต์", levelName: "โปรเจกต์" },
  ];

  // Apply filters and sorting
  let filteredCourses = courses.filter((course) => {
    // Check Tab (Level)
    const activeTabObj = tabs.find(t => t.id === activeTab);
    const matchesTab = activeTab === "all" || (activeTabObj && course.level === activeTabObj.levelName);
    
    // Check Search
    const matchesSearch = !searchQuery || 
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesTab && matchesSearch;
  });

  // Apply sorting
  if (sortBy === "oldest") {
    filteredCourses.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sortBy === "title") {
    filteredCourses.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else {
    // Default: latest
    filteredCourses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">บทเรียนทั้งหมด</h1>
          <p className="text-slate-500 mt-1">เลือกบทเรียนที่คุณต้องการเริ่มเรียน</p>
        </div>
        
        <div className="flex items-center gap-2 relative z-20">
          {/* Search Input */}
          <div 
            className="flex items-center"
            onMouseEnter={() => setIsSearchOpen(true)}
            onMouseLeave={() => {
              if (!searchQuery) setIsSearchOpen(false);
            }}
          >
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSearchOpen ? 'w-48 sm:w-64 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
              <input
                type="text"
                placeholder="ค้นหาบทเรียน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2.5 rounded-full transition-colors ${isSearchOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'vision-glass text-slate-600 dark:text-slate-300 hover:text-blue-600'}`}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          
          {/* Filter/Sort Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setIsFilterOpen(true)}
            onMouseLeave={() => setIsFilterOpen(false)}
          >
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2.5 rounded-full transition-colors ${isFilterOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'vision-glass text-slate-600 dark:text-slate-300 hover:text-blue-600'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 top-full pt-2 z-50">
                <div className="min-w-[140px] w-max bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 mb-1 whitespace-nowrap">
                    เรียงตาม
                  </div>
                  <button onClick={() => { setSortBy("latest"); setIsFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 whitespace-nowrap ${sortBy === 'latest' ? 'text-blue-600 font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                    ใหม่ล่าสุด
                  </button>
                  <button onClick={() => { setSortBy("oldest"); setIsFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 whitespace-nowrap ${sortBy === 'oldest' ? 'text-blue-600 font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                    เก่าที่สุด
                  </button>
                  <button onClick={() => { setSortBy("title"); setIsFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 whitespace-nowrap ${sortBy === 'title' ? 'text-blue-600 font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                    ชื่อ (ก-ฮ)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            ไม่พบบทเรียนที่ตรงกับคำค้นหา
          </div>
        ) : (
          filteredCourses.map((course: any) => {
            const color = course.color || "from-blue-500 to-indigo-600";
          const level = course.level || "สำหรับทุกคน";
          const duration = course.totalLessons ? `${course.totalLessons} บทเรียน` : "ยังไม่มีเนื้อหา";
          // Calculate total lessons and completed lessons for this course
          let totalLessons = 0;
          let completedLessons = 0;
          
          if (course.modules && Array.isArray(course.modules)) {
            course.modules.forEach((mod: any) => {
              if (mod.lessons && Array.isArray(mod.lessons)) {
                totalLessons += mod.lessons.length;
                mod.lessons.forEach((lesson: any) => {
                  if (completedLessonIds.includes(String(lesson.id))) {
                    completedLessons++;
                  }
                });
              }
            });
          }
          
          let progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
          const instructor = course.instructor || "คุณครูผู้สอน";
          const description = course.description || "บทเรียนนี้ยังไม่มีคำอธิบายเพิ่มเติม";
          
          const getLevelColor = (lvl: string) => {
            switch (lvl) {
              case 'พื้นฐาน': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
              case 'ขั้นสูง': return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
              case 'โปรเจกต์': return 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
              default: return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
            }
          };
          const levelColorClass = getLevelColor(level);
          
          return (
          <Link href={`/student/learn/${course.id}`} key={course.id} className="vision-glass vision-glass-hoverable group flex flex-col h-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            {/* Course Image Area */}
            <div className={`h-40 w-full bg-gradient-to-br ${color} relative overflow-hidden flex items-center justify-center`}>
              <img 
                src={
                  course.title?.includes('6') || course.title?.includes('ฟอร์ม') 
                    ? "/images/cover_chapter6.png" 
                    : course.title?.includes('7') || course.title?.includes('รายงาน')
                    ? "/images/cover_chapter7.png"
                    : "/images/database_cover.png"
                } 
                alt={course.title} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300"></div>
              
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl z-0"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-black/10 rounded-full blur-md z-0"></div>
            </div>
            
            {/* Course Content */}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${levelColorClass}`}>
                  {level}
                </span>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {duration}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {course.title}
              </h3>
              <p className="text-sm text-slate-500 mb-6 line-clamp-2">
                {description}
              </p>
              
              <div className="mt-auto">
                {progress === 100 ? (
                  <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                        {adminAvatar ? (
                          <img src={adminAvatar} alt={instructor} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{instructor}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 flex items-center group-hover:translate-x-1 transition-transform">
                      เรียนจบแล้ว <CheckCircle className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                ) : progress > 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-600 dark:text-slate-300">ความก้าวหน้า</span>
                        <span className="text-blue-600">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          {adminAvatar ? (
                            <img src={adminAvatar} alt={instructor} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{instructor}</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-500 flex items-center group-hover:translate-x-1 transition-transform">
                        เรียนต่อ <ChevronRight className="w-4 h-4 ml-0.5" />
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                        {adminAvatar ? (
                          <img src={adminAvatar} alt={instructor} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{instructor}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                        เริ่มเรียน <ChevronRight className="w-4 h-4 ml-0.5" />
                      </span>
                  </div>
                )}
              </div>
            </div>
          </Link>
          );
        }))}
      </div>
    </div>
  );
}
