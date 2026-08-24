"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, GripVertical, FileText, PlayCircle, HelpCircle, Save, Settings, Eye, X, Loader2, Upload } from "lucide-react";
import { getCourseWithCurriculum, createModule, updateModule, createLesson, updateLesson, updateCourse, getAdminUsers } from "@/utils/supabase/queries";
import { useParams } from "next/navigation";
import SortableCurriculum from "@/components/admin/SortableCurriculum";

import { toast } from "sonner";

export default function CourseBuilder() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('curriculum');
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseStatus, setCourseStatus] = useState("Draft");
  const [courseInstructor, setCourseInstructor] = useState("");

  // Modals state
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [moduleTitle, setModuleTitle] = useState("");

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState("slide");
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const fetchCourse = async () => {
    setLoading(true);
    if (params?.id) {
      const data = await getCourseWithCurriculum(params.id as string);
      
      if (data) {
        setCourse(data);
        setCourseTitle(data.title || "");
        setCourseCode(data.code || "");
        setCourseDesc(data.description || "");
        setCourseStatus(data.status || "Draft");
        setCourseInstructor(data.instructor || "");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourse();
  }, [params?.id]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;
  }

  if (!course) {
    return <div className="p-12 text-center text-red-500">ไม่พบคอร์สเรียน</div>;
  }

  const courseName = course.title;
  const modules = course.modules || [];

  // Module Handlers
  const openModuleModal = (mod: any = null) => {
    setEditingModule(mod);
    setModuleTitle(mod ? mod.title : "");
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleTitle.trim() || isSaving) return;
    setIsSaving(true);
    if (editingModule) {
      await updateModule(editingModule.id, moduleTitle);
    } else {
      const nextOrder = modules.length;
      await createModule(course.id, moduleTitle, nextOrder);
    }
    await fetchCourse();
    setIsModuleModalOpen(false);
    setIsSaving(false);
  };

  // Lesson Handlers
  const openLessonModal = (modId: string, less: any = null) => {
    setTargetModuleId(modId);
    setEditingLesson(less);
    setLessonTitle(less ? less.title : "");
    setLessonType(less ? less.type : "slide");
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle.trim() || !targetModuleId || isSaving) return;
    setIsSaving(true);
    
    if (editingLesson) {
      await updateLesson(editingLesson.id, { title: lessonTitle, type: lessonType });
    } else {
      const targetMod = modules.find((m: any) => m.id === targetModuleId);
      const nextOrder = targetMod && targetMod.lessons ? targetMod.lessons.length : 0;
      await createLesson(targetModuleId, lessonTitle, lessonType, nextOrder);
    }
    await fetchCourse();
    setIsLessonModalOpen(false);
    setIsSaving(false);
  };

  const handleSaveSettings = async () => {
    if (!courseTitle.trim() || isSaving) return;
    setIsSaving(true);
    const successOrError = await updateCourse(course.id, {
      title: courseTitle,
      code: courseCode,
      description: courseDesc,
      status: courseStatus,
      instructor: courseInstructor || null
    });
    setIsSaving(false);
    if (successOrError === true) {
      toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      await fetchCourse();
    } else {
      toast.error(`เกิดข้อผิดพลาดในการบันทึก: ${successOrError}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/courses" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            กลับหน้ารายการบทเรียน
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">จัดการเนื้อหา: {courseName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/student/courses" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl shadow-sm transition-colors">
            <Eye className="w-4 h-4" />
            ดูมุมมองนักเรียน
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('curriculum')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'curriculum' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          โครงสร้างเนื้อหา (Curriculum)
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          ตั้งค่าบทเรียน (Settings)
        </button>
      </div>

      {/* Content */}
      {activeTab === 'curriculum' && (
        <SortableCurriculum 
          initialModules={modules}
          courseId={course.id}
          openModuleModal={openModuleModal}
          openLessonModal={openLessonModal}
          fetchCourse={fetchCourse}
        />
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">ตั้งค่าบทเรียน</h2>
          <div className="space-y-5 max-w-2xl">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อบทเรียน <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">รหัสวิชา</label>
              <input 
                type="text" 
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">รายละเอียดเพิ่มเติม</label>
              <textarea 
                rows={4}
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">ครูผู้สอนประจำบทเรียน</label>
              <input 
                type="text"
                value={courseInstructor}
                onChange={(e) => setCourseInstructor(e.target.value)}
                placeholder="เช่น อ. สมบูรณ์"
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">สถานะ</label>
              <select 
                value={courseStatus}
                onChange={(e) => setCourseStatus(e.target.value)}
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Draft">แบบร่าง (Draft) - ซ่อนจากนักเรียน</option>
                <option value="Active">เปิดใช้งาน (Active) - แสดงให้นักเรียนเห็น</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={handleSaveSettings}
                disabled={isSaving || !courseTitle.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module Modal */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {editingModule ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
              </h3>
              <button onClick={() => setIsModuleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อหมวดหมู่</label>
                <input 
                  type="text" 
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="เช่น บทที่ 1: แนะนำเบื้องต้น"
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button 
                onClick={handleSaveModule}
                disabled={isSaving || !moduleTitle.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 flex justify-center"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {editingLesson ? 'แก้ไขบทเรียน' : 'เพิ่มบทเรียนใหม่'}
              </h3>
              <button onClick={() => setIsLessonModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อบทเรียน</label>
                <input 
                  type="text" 
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="เช่น 1.1 ความหมายของฐานข้อมูล"
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ประเภทบทเรียน</label>
                <div className="space-y-2">
                  {[
                    { id: 'slide', label: 'ทฤษฎี (PDF/Slide)', icon: FileText },
                    { id: 'video_worksheet', label: 'ปฏิบัติ (วิดีโอ + ใบงาน)', icon: PlayCircle },
                    { id: 'quiz', label: 'ควิซ (Quiz ย่อย)', icon: HelpCircle },
                    { id: 'test', label: 'แบบทดสอบ (ก่อน/หลังเรียน)', icon: HelpCircle },
                    { id: 'assignment', label: 'ส่งงานปฏิบัติ (Upload)', icon: Upload }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setLessonType(type.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                        lessonType === type.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleSaveLesson}
                disabled={isSaving || !lessonTitle.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 flex justify-center"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
