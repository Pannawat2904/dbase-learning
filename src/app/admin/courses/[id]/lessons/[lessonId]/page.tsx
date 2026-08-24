"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Save, FileText, PlayCircle, HelpCircle, Loader2, Plus, Trash2, Settings, Clock, Target, GripVertical, Wand2, X, Sparkles, Upload, Paperclip, Award, Calendar, BookOpen, Layers, CheckSquare, FileCheck } from "lucide-react";
import { getLesson, updateLesson } from "@/utils/supabase/queries";
import AIQuizGeneratorModal from "@/components/admin/AIQuizGeneratorModal";

import { toast } from "sonner";

export default function LessonEditor() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Content states
  const [pdfUrl, setPdfUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [worksheetUrl, setWorksheetUrl] = useState("");
  const [contentBody, setContentBody] = useState("");

  // Assignment states
  const [assignmentMaxScore, setAssignmentMaxScore] = useState<number | string>(10);
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>("");
  const [allowedFileTypes, setAllowedFileTypes] = useState<string>(".accdb, .sql, .pdf, .zip, .docx");
  const [worksheetFileUrl, setWorksheetFileUrl] = useState<string>("");
  const [worksheetFileName, setWorksheetFileName] = useState<string>("");
  const [rubricText, setRubricText] = useState<string>("");
  const [isGeneratingAssignment, setIsGeneratingAssignment] = useState<boolean>(false);
  
  // Quiz states
  const [questions, setQuestions] = useState<any[]>([]);
  const [timeLimit, setTimeLimit] = useState<number | string>(0);
  const [passingScore, setPassingScore] = useState<number | string>(50);
  const [examType, setExamType] = useState<string>("quiz");
  
  // Smart Paste states
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [smartPasteText, setSmartPasteText] = useState("");
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const handleAIQuestionsGenerated = (newQuestions: any[]) => {
    setQuestions([...questions, ...newQuestions]);
  };

  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;

  useEffect(() => {
    async function fetchLesson() {
      if (lessonId) {
        const data = await getLesson(lessonId);
        if (data) {
          setLesson(data);
          const c = data.content || {};
          setPdfUrl(c.pdfUrl || "");
          setYoutubeUrl(c.youtubeUrl || "");
          setWorksheetUrl(c.worksheetUrl || "");
          setContentBody(c.body || "");
          setAssignmentMaxScore(c.maxScore !== undefined ? c.maxScore : 10);
          setAssignmentDueDate(c.dueDate || "");
          setAllowedFileTypes(c.allowedFileTypes || ".accdb, .sql, .pdf, .zip, .docx");
          setWorksheetFileUrl(c.worksheetFileUrl || c.worksheetUrl || "");
          setWorksheetFileName(c.worksheetFileName || "");
          setRubricText(c.rubric || "");
          setQuestions(c.questions || []);
          setTimeLimit(c.timeLimit !== undefined ? c.timeLimit : 0);
          setPassingScore(c.passingScore !== undefined ? c.passingScore : 50);

          if (c.examType) {
            setExamType(c.examType);
          } else {
            const title = (data.title || '').toLowerCase();
            if (title.includes('pre') || title.includes('ก่อนเรียน')) {
              setExamType('pre-test');
            } else if (title.includes('post') || title.includes('หลังเรียน')) {
              setExamType('post-test');
            } else {
              setExamType('quiz');
            }
          }
        }
      }
      setLoading(false);
    }
    fetchLesson();
  }, [lessonId]);

  const handleSave = async () => {
    if (isSaving || !lesson) return;
    setIsSaving(true);

    const cleanPassingScore = passingScore === '' ? 50 : Math.max(1, Math.min(100, Number(passingScore) || 50));
    const cleanTimeLimit = timeLimit === '' ? 0 : Math.max(0, Number(timeLimit) || 0);
    const cleanMaxScore = assignmentMaxScore === '' ? 10 : Math.max(1, Number(assignmentMaxScore) || 10);
    const cleanQuestions = questions.map(q => ({
      ...q,
      points: q.points === '' || q.points === undefined ? 1 : Math.max(1, Number(q.points) || 1)
    }));

    const newContent = {
      pdfUrl,
      youtubeUrl,
      worksheetUrl,
      body: contentBody,
      ...(lesson.type === 'assignment' ? {
        maxScore: cleanMaxScore,
        dueDate: assignmentDueDate,
        allowedFileTypes,
        worksheetFileUrl,
        worksheetFileName,
        rubric: rubricText
      } : {}),
      ...((lesson.type === 'quiz' || lesson.type === 'test') ? { questions: cleanQuestions, timeLimit: cleanTimeLimit, passingScore: cleanPassingScore, examType } : {})
    };

    const successOrError = await updateLesson(lesson.id, { content: newContent });
    setIsSaving(false);
    if (successOrError === true) {
      toast.success("บันทึกข้อมูลเรียบร้อยแล้ว");
    } else {
      toast.error(`เกิดข้อผิดพลาดในการบันทึก: ${successOrError}`);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now().toString(),
        text: "",
        type: "multiple-choice",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        points: 1
      }
    ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    if (!updated[qIndex].options) updated[qIndex].options = [];
    updated[qIndex].options.push("");
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options && updated[qIndex].options.length > 2) {
      updated[qIndex].options.splice(optIndex, 1);
      if (updated[qIndex].correctOptionIndex === optIndex) {
        updated[qIndex].correctOptionIndex = 0;
      } else if (updated[qIndex].correctOptionIndex > optIndex) {
        updated[qIndex].correctOptionIndex -= 1;
      }
      setQuestions(updated);
    }
  };

  const handleSmartPaste = () => {
    if (!smartPasteText.trim()) {
      toast.warning("กรุณาวางข้อความก่อนครับ");
      return;
    }
    
    const lines = smartPasteText.split('\n').map(l => l.trim()).filter(Boolean);
    const newQuestions: any[] = [];
    let currentQ: any = null;
    
    // Regex for matching
    const questionPrefixes = /^\d+\.\s*(.+)/;
    const optionPrefixes = /^[กขคงA-Da-d]\.\s*(.+)/;

    lines.forEach(line => {
      const qMatch = line.match(questionPrefixes);
      if (qMatch) {
        if (currentQ) newQuestions.push(currentQ);
        currentQ = { 
          id: crypto.randomUUID(), 
          type: 'multiple-choice', 
          text: qMatch[1], 
          options: [], 
          correctOptionIndex: 0, 
          points: 1 
        };
      } else {
        const oMatch = line.match(optionPrefixes);
        if (oMatch && currentQ) {
          currentQ.options.push(oMatch[1]);
        } else if (currentQ) {
          // multi-line text
          if (currentQ.options.length === 0) currentQ.text += '\n' + line;
          else currentQ.options[currentQ.options.length - 1] += '\n' + line;
        }
      }
    });
    
    if (currentQ) newQuestions.push(currentQ);
    
    if (newQuestions.length > 0) {
      setQuestions([...questions, ...newQuestions]);
      setSmartPasteText("");
      setIsSmartPasteOpen(false);
      toast.success(`นำเข้าคำถามสำเร็จ ${newQuestions.length} ข้อ`);
    } else {
      toast.error("ไม่พบรูปแบบคำถามในข้อความ กรุณาตรวจสอบให้แน่ใจว่าข้อความขึ้นต้นด้วย 1. และตัวเลือกขึ้นต้นด้วย ก. ข. ค. ง.");
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!lesson) {
    return <div className="p-12 text-center text-red-500">ไม่พบบทเรียน</div>;
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    
    // Handle Google Drive
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    
    // Handle Canva
    if (url.includes("canva.com/design/")) {
      let canvaUrl = url;
      // Convert edit links to view links
      if (canvaUrl.includes("/edit")) {
        canvaUrl = canvaUrl.replace("/edit", "/view");
      }
      // Ensure embed parameter is present for Canva
      if (!canvaUrl.includes("embed")) {
        canvaUrl = canvaUrl.includes("?") ? `${canvaUrl}&embed` : `${canvaUrl}?embed`;
      }
      return canvaUrl;
    }

    return url;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href={`/admin/courses/${courseId}`} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            กลับหน้าจัดการเนื้อหาบทเรียน
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {lesson.type === 'slide' ? <FileText className="w-6 h-6" /> : 
               lesson.type === 'video_worksheet' ? <PlayCircle className="w-6 h-6" /> : 
               <HelpCircle className="w-6 h-6" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              แก้ไขบทเรียน: {lesson.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
        
        {lesson.type === 'slide' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">อัปโหลดสไลด์ (Canva / PDF)</h3>
              <p className="text-sm text-slate-500 mb-4">วางลิงก์สไลด์จาก Canva หรือลิงก์ไฟล์ PDF (เช่น Google Drive) เพื่อให้นักเรียนเปิดอ่านบนเว็บได้เลย</p>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">URL ของสไลด์ (Canva หรือ PDF)</label>
                <input 
                  type="url" 
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  placeholder="https://www.canva.com/design/... หรือลิงก์ Google Drive"
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {pdfUrl && (
              <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[500px]">
                <iframe src={getEmbedUrl(pdfUrl)} className="w-full h-full" title="Slide Preview" allowFullScreen></iframe>
              </div>
            )}
          </div>
        )}

        {lesson.type === 'video_worksheet' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">วิดีโอประกอบการเรียน (YouTube)</h3>
              <p className="text-sm text-slate-500 mb-4">คัดลอกลิงก์จากวิดีโอ YouTube ของคุณแล้วนำมาวางที่นี่ ระบบจะแสดงวิดีโอให้นักเรียนดูได้ทันที</p>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">YouTube URL</label>
                <input 
                  type="url" 
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {youtubeUrl && (
                <div className="mt-4 rounded-xl overflow-hidden aspect-video bg-black">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={(() => {
                      const match = youtubeUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                      const videoId = (match && match[2].length === 11) ? match[2] : null;
                      return videoId ? `https://www.youtube.com/embed/${videoId}` : youtubeUrl;
                    })()}
                    title="YouTube Preview"
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">ลิงก์ใบงาน (Worksheet / Google Form)</h3>
              <p className="text-sm text-slate-500 mb-4">วางลิงก์ใบงาน เช่น Google Form, Liveworksheet, หรือ Google Docs เพื่อให้นักเรียนกดเข้าไปทำแบบทดสอบหรือใบงานได้ทันที</p>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">URL ของใบงาน</label>
                <input 
                  type="url" 
                  value={worksheetUrl}
                  onChange={(e) => setWorksheetUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {lesson.type === 'assignment' && (
          <div className="space-y-8">
            {/* Header & Quick Action Bar */}
            <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 p-6 rounded-2xl border border-purple-200 dark:border-purple-800/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold mb-2">
                    <Upload className="w-3.5 h-3.5" /> งานปฏิบัติการ (Practical Assignment)
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">กำหนดโจทย์และรายละเอียดใบงานปฏิบัติ</h3>
                  <p className="text-sm text-slate-500 mt-1">กำหนดคำสั่ง จุดประสงค์ เกณฑ์การให้คะแนน และไฟล์แนบประกอบใบงาน เพื่อให้นักเรียนทำและอัปโหลดส่ง</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* AI Generate Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      setIsGeneratingAssignment(true);
                      try {
                        const prompt = `ช่วยร่างคำสั่งและโจทย์งานปฏิบัติ (Practical Assignment) สำหรับรายวิชาโปรแกรมฐานข้อมูล (Microsoft Access / SQL) เรื่อง "${lesson.title}"
โดยจัดโครงสร้าง HTML ให้มีหัวข้อ:
1. <h3>📌 จุดประสงค์การเรียนรู้</h3> (พร้อม <ul><li>)
2. <h3>🛠️ คำสั่งและขั้นตอนการปฏิบัติงาน</h3> (พร้อม <ol><li>)
3. <h3>📦 สิ่งที่ต้องส่ง</h3> (พร้อม <p>)
ตอบเฉพาะโค้ด HTML สวยงาม ไม่ต้องใส่ markdown backticks`;

                        const res = await fetch("/api/chat", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ message: prompt })
                        });
                        const data = await res.json();
                        if (data.reply) {
                          const clean = data.reply.replace(/```html/g, '').replace(/```/g, '').trim();
                          setContentBody(clean);
                          setAssignmentMaxScore(10);
                          setAllowedFileTypes(".accdb, .zip, .pdf, .docx");
                          setRubricText("1. ความถูกต้องสมบูรณ์ของชิ้นงาน : 5 คะแนน\n2. ความถูกต้องของโครงสร้างข้อมูล/ฟังก์ชัน : 3 คะแนน\n3. ความเรียบร้อยและการส่งตรงเวลา : 2 คะแนน");
                          toast.success("AI ช่วยร่างโจทย์และเกณฑ์ใบงานเรียบร้อยแล้ว!");
                        } else {
                          toast.error("ไม่สามารถเชื่อมต่อ AI ได้");
                        }
                      } catch (err) {
                        toast.error("เกิดข้อผิดพลาดในการเรียก AI");
                      } finally {
                        setIsGeneratingAssignment(false);
                      }
                    }}
                    disabled={isGeneratingAssignment}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/20 disabled:opacity-60 transition-all"
                  >
                    {isGeneratingAssignment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI กำลังร่างโจทย์...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>✨ AI ช่วยร่างโจทย์งาน</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Template Quick Selectors */}
              <div className="mt-4 pt-4 border-t border-purple-200/60 dark:border-purple-800/40">
                <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-2">เลือกแม่แบบโจทย์สำเร็จรูป:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: "📋 ออกแบบตารางและคีย์ (Table & PK)",
                      body: `<h3>📌 จุดประสงค์การเรียนรู้</h3>\n<ul>\n  <li>สามารถออกแบบโครงสร้างตารางข้อมูลในโปรแกรม Microsoft Access ได้อย่างถูกต้อง</li>\n  <li>สามารถกำหนด Primary Key และชนิดข้อมูล (Data Types) ได้เหมาะสม</li>\n</ul>\n\n<h3>🛠️ คำสั่งและขั้นตอนการปฏิบัติงาน</h3>\n<ol>\n  <li>สร้างฐานข้อมูลใหม่ชื่อ <code>DB_Lab_รหัสนักศึกษา.accdb</code></li>\n  <li>สร้างตารางข้อมูลอย่างน้อย 2 ตาราง กำหนดฟิลด์และ Primary Key ให้ครบถ้วน</li>\n  <li>ป้อนข้อมูลตัวอย่างอย่างน้อยตารางละ 5 รายการ</li>\n</ol>\n\n<h3>📦 สิ่งที่ต้องส่ง</h3>\n<p>ไฟล์ฐานข้อมูล Microsoft Access (<code>.accdb</code>) หรือไฟล์บีบอัด (<code>.zip</code>)</p>`,
                      rubric: `1. ความถูกต้องของโครงสร้างตารางและชนิดข้อมูล : 4 คะแนน\n2. การกำหนด Primary Key และความสมบูรณ์ของข้อมูล : 4 คะแนน\n3. ความเรียบร้อยและการส่งตรงเวลา : 2 คะแนน`,
                      types: ".accdb, .zip, .pdf"
                    },
                    {
                      label: "📋 ความสัมพันธ์ (Relationships)",
                      body: `<h3>📌 จุดประสงค์การเรียนรู้</h3>\n<ul>\n  <li>สามารถสร้างความสัมพันธ์ระหว่างตารางแบบ One-to-Many ได้ถูกต้อง</li>\n  <li>สามารถกำหนด Referential Integrity เพื่อรักษาความสมบูรณ์ของข้อมูลได้</li>\n</ul>\n\n<h3>🛠️ คำสั่งและขั้นตอนการปฏิบัติงาน</h3>\n<ol>\n  <li>เปิดหน้าต่าง Relationships แล้วเพิ่มตารางหลักและตารางย่อย</li>\n  <li>เชื่อมโยงความสัมพันธ์ และติ๊กเลือก Enforce Referential Integrity</li>\n  <li>ทดสอบป้อนข้อมูลเพื่อตรวจสอบการทำงาน</li>\n</ol>\n\n<h3>📦 สิ่งที่ต้องส่ง</h3>\n<p>ไฟล์ฐานข้อมูล <code>.accdb</code> หรือไฟล์ภาพสรุปผล (<code>.pdf / .zip</code>)</p>`,
                      rubric: `1. ความถูกต้องของการเชื่อมโยงความสัมพันธ์ One-to-Many : 5 คะแนน\n2. การตั้งค่า Referential Integrity : 3 คะแนน\n3. ความสมบูรณ์ของข้อมูล : 2 คะแนน`,
                      types: ".accdb, .zip, .pdf"
                    },
                    {
                      label: "📋 การสร้างฟอร์มและรายงาน (Forms & Reports)",
                      body: `<h3>📌 จุดประสงค์การเรียนรู้</h3>\n<ul>\n  <li>สามารถสร้าง Form สำหรับป้อนข้อมูลและปรับแต่งดีไซน์ได้</li>\n  <li>สามารถสร้าง Report สรุปผลพร้อมจัดกลุ่มและใส่สูตรคำนวณได้</li>\n</ul>\n\n<h3>🛠️ คำสั่งและขั้นตอนการปฏิบัติงาน</h3>\n<ol>\n  <li>สร้าง Data Entry Form พร้อมปุ่ม Navigation</li>\n  <li>สร้าง Summary Report จัดกลุ่มข้อมูลและใส่สูตรหาผลรวม</li>\n</ol>\n\n<h3>📦 สิ่งที่ต้องส่ง</h3>\n<p>ไฟล์ฐานข้อมูล <code>.accdb</code> ที่มี Form และ Report ครบถ้วน</p>`,
                      rubric: `1. การออกแบบ Form และปุ่มนำทาง : 4 คะแนน\n2. การสร้าง Report พร้อมการจัดกลุ่มและสูตรคำนวณ : 4 คะแนน\n3. ความสวยงามของชิ้นงาน : 2 คะแนน`,
                      types: ".accdb, .zip, .pdf"
                    },
                    {
                      label: "📋 การเขียนคำสั่ง SQL (Queries)",
                      body: `<h3>📌 จุดประสงค์การเรียนรู้</h3>\n<ul>\n  <li>สามารถเขียนคำสั่ง SQL และสร้าง Query ค้นหาข้อมูลตามเงื่อนไขได้</li>\n</ul>\n\n<h3>🛠️ คำสั่งและขั้นตอนการปฏิบัติงาน</h3>\n<ol>\n  <li>สร้าง Query คัดกรองข้อมูลตามเงื่อนไขที่กำหนด</li>\n  <li>สร้าง Query คำนวณสรุปยอดข้อมูล และ Query เชื่อมโยงตาราง</li>\n</ol>\n\n<h3>📦 สิ่งที่ต้องส่ง</h3>\n<p>ไฟล์ฐานข้อมูล <code>.accdb</code> หรือไฟล์คำสั่ง (<code>.sql / .pdf</code>)</p>`,
                      rubric: `1. ความถูกต้องของคำสั่ง SQL เงื่อนไขที่ 1 : 3 คะแนน\n2. ความถูกต้องของ Query คำนวณสรุปผล : 3 คะแนน\n3. ความถูกต้องของ Query เชื่อมหลายตาราง : 4 คะแนน`,
                      types: ".accdb, .sql, .zip, .pdf"
                    }
                  ].map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setContentBody(tpl.body);
                        setRubricText(tpl.rubric);
                        setAllowedFileTypes(tpl.types);
                        setAssignmentMaxScore(10);
                        toast.success(`โหลดแม่แบบ "${tpl.label}" เรียบร้อยแล้ว`);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors shadow-sm"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Assignment Content */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                คำสั่งและรายละเอียดโจทย์งานปฏิบัติ (Instructions / Description)
              </label>
              <p className="text-xs text-slate-500">พิมพ์คำอธิบาย จุดประสงค์ ขั้นตอนการทำงาน และสิ่งที่ต้องส่ง (รองรับ HTML และข้อความทั่วไป)</p>
              <textarea 
                rows={10}
                value={contentBody}
                onChange={(e) => setContentBody(e.target.value)}
                placeholder="ระบุคำสั่งและโจทย์งานปฏิบัติ เช่น ให้นักเรียนออกแบบฐานข้อมูล..."
                className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans text-sm leading-relaxed"
              ></textarea>
            </div>

            {/* Settings Grid: Max Score, Due Date, Allowed Extensions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Max Score */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-amber-500" />
                  <label className="font-bold text-slate-800 dark:text-white text-sm">คะแนนเต็ม (Max Score)</label>
                </div>
                <input 
                  type="number"
                  min="1"
                  max="100"
                  value={assignmentMaxScore}
                  onChange={(e) => setAssignmentMaxScore(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  onBlur={() => {
                    if (assignmentMaxScore === '') setAssignmentMaxScore(10);
                  }}
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
                  placeholder="10"
                />
                <p className="text-xs text-slate-500 mt-2">คะแนนเต็มสำหรับงานปฏิบัตินี้</p>
              </div>

              {/* Due Date */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <label className="font-bold text-slate-800 dark:text-white text-sm">กำหนดส่งงาน (Due Date)</label>
                </div>
                <input 
                  type="date"
                  value={assignmentDueDate}
                  onChange={(e) => setAssignmentDueDate(e.target.value)}
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">วันสุดท้ายที่เปิดรับงาน (เว้นว่างได้)</p>
              </div>

              {/* Allowed File Types */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="w-5 h-5 text-emerald-500" />
                  <label className="font-bold text-slate-800 dark:text-white text-sm">สกุลไฟล์ที่ยอมรับ</label>
                </div>
                <input 
                  type="text"
                  value={allowedFileTypes}
                  onChange={(e) => setAllowedFileTypes(e.target.value)}
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono text-xs"
                  placeholder=".accdb, .sql, .pdf, .zip, .docx"
                />
                <p className="text-xs text-slate-500 mt-2">คั่นด้วยเครื่องหมายจุลภาค (,)</p>
              </div>
            </div>

            {/* Attached Reference / Worksheet Download Link */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-indigo-500" />
                <h4 className="font-bold text-slate-800 dark:text-white text-base">ไฟล์เอกสารใบงาน / เทมเพลตประกอบให้นักเรียนดาวน์โหลด (Optional)</h4>
              </div>
              <p className="text-xs text-slate-500">หากมีไฟล์ตัวอย่าง แบบฟอร์ม หรือไฟล์ฐานข้อมูลเริ่มต้น ให้นักเรียนดาวน์โหลดไปทำต่อ สามารถใส่ URL หรือชื่อไฟล์ได้ที่นี่</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">URL ไฟล์ใบงาน / ไฟล์ตัวอย่าง</label>
                  <input 
                    type="url"
                    value={worksheetFileUrl}
                    onChange={(e) => setWorksheetFileUrl(e.target.value)}
                    placeholder="https://... หรือลิงก์ Google Drive / Supabase"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ชื่อแสดงผลของไฟล์ดาวน์โหลด</label>
                  <input 
                    type="text"
                    value={worksheetFileName}
                    onChange={(e) => setWorksheetFileName(e.target.value)}
                    placeholder="เช่น ใบงานที่ 1_การสร้างตาราง.pdf หรือ DB_Template.accdb"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Rubric / Scoring Criteria */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-teal-500" />
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  เกณฑ์การให้คะแนน (Scoring Rubric)
                </label>
              </div>
              <p className="text-xs text-slate-500">ระบุเกณฑ์การประเมินคะแนนเพื่อให้นักเรียนเข้าใจมาตรฐานการตรวจ</p>
              <textarea 
                rows={4}
                value={rubricText}
                onChange={(e) => setRubricText(e.target.value)}
                placeholder="เช่น 1. ความถูกต้องของตารางและคีย์หลัก (4 คะแนน)&#10;2. ความสมบูรณ์ของความสัมพันธ์ (4 คะแนน)&#10;3. การส่งตรงเวลา (2 คะแนน)"
                className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans text-sm"
              ></textarea>
            </div>
          </div>
        )}

        {(lesson.type === 'quiz' || lesson.type === 'test') && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 1. Exam Type Selector */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-800 dark:text-white">ประเภทแบบทดสอบ</h3>
                </div>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                >
                  <option value="pre-test">📝 แบบทดสอบก่อนเรียน (Pre-test)</option>
                  <option value="post-test">🎯 แบบทดสอบหลังเรียน (Post-test)</option>
                  <option value="quiz">💡 แบบทดสอบย่อย / ท้ายบท (Quiz)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">กำหนดสำหรับจัดกลุ่มงานวิจัย</p>
              </div>

              {/* 2. Time Limit */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-slate-800 dark:text-white">เวลาในการทำ (นาที)</h3>
                </div>
                <input 
                  type="number" 
                  min="0"
                  value={timeLimit}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTimeLimit(val === '' ? '' : parseInt(val, 10));
                  }}
                  onBlur={() => {
                    if (timeLimit === '') setTimeLimit(0);
                  }}
                  placeholder="0 = ไม่จำกัดเวลา"
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">ใส่ 0 หากไม่ต้องการจำกัดเวลา</p>
              </div>

              {/* 3. Passing Score */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-800 dark:text-white">เกณฑ์การสอบผ่าน (%)</h3>
                </div>
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  value={passingScore}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPassingScore(val === '' ? '' : parseInt(val, 10));
                  }}
                  onBlur={() => {
                    if (passingScore === '' || Number(passingScore) < 1) setPassingScore(50);
                  }}
                  placeholder="50"
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">คะแนนรวมคิดเป็นร้อยละ (เช่น 50%)</p>
              </div>

            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">รายการคำถาม</h3>
                  <p className="text-sm text-slate-500 mt-1">ทั้งหมด {questions.length} ข้อ</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsAIModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    สร้างข้อสอบด้วย AI
                  </button>
                  <button 
                    onClick={() => setIsSmartPasteOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    นำเข้าข้อสอบ (Smart Paste)
                  </button>
                  <button 
                    onClick={addQuestion}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มคำถาม
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {questions.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ยังไม่มีคำถามในชุดนี้ กด "เพิ่มคำถาม" เพื่อเริ่มต้น</p>
                  </div>
                ) : (
                  questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                      <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            ข้อที่ {qIndex + 1}
                          </label>
                          <textarea 
                            value={q.text}
                            onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                            placeholder="พิมพ์โจทย์คำถามที่นี่..."
                            rows={3}
                            className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div className="w-full md:w-48 space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">รูปแบบ</label>
                            <select 
                              value={q.type}
                              onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="multiple-choice">ปรนัย (ตัวเลือก)</option>
                              <option value="essay">อัตนัย (เขียนตอบ)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">คะแนน</label>
                            <input 
                              type="number" 
                              min="0"
                              value={q.points === undefined || q.points === null ? '' : q.points}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateQuestion(qIndex, 'points', val === '' ? '' : parseInt(val, 10));
                              }}
                              onBlur={() => {
                                if (q.points === '' || Number(q.points) < 1) updateQuestion(qIndex, 'points', 1);
                              }}
                              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {q.type === 'multiple-choice' && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">ตัวเลือก (คลิกจุดวงกลมเพื่อเลือกข้อที่ถูก)</label>
                          <div className="space-y-2">
                            {q.options?.map((opt: string, optIndex: number) => (
                              <div key={optIndex} className="flex items-center gap-3">
                                <input 
                                  type="radio" 
                                  name={`correct-${q.id || qIndex}`} 
                                  checked={q.correctOptionIndex === optIndex}
                                  onChange={() => updateQuestion(qIndex, 'correctOptionIndex', optIndex)}
                                  className="w-5 h-5 text-emerald-500 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                />
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-500 w-4">{String.fromCharCode(65 + optIndex)}</span>
                                  <input 
                                    type="text" 
                                    value={opt}
                                    onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                    placeholder={`ตัวเลือกที่ ${optIndex + 1}`}
                                    className={`flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 ${q.correctOptionIndex === optIndex ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-700 focus:ring-emerald-500' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-blue-500'}`}
                                  />
                                </div>
                                <button 
                                  onClick={() => removeOption(qIndex, optIndex)}
                                  disabled={(q.options?.length || 0) <= 2}
                                  aria-label={`ลบตัวเลือกที่ ${optIndex + 1}`}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button 
                            onClick={() => addOption(qIndex)}
                            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> เพิ่มตัวเลือก
                          </button>
                        </div>
                      )}

                      <div className="flex justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button 
                          onClick={() => removeQuestion(qIndex)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> ลบคำถามนี้
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Smart Paste Modal */}
      {isSmartPasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">นำเข้าข้อสอบ (Smart Paste)</h2>
                  <p className="text-sm text-slate-500">คัดลอกข้อสอบจาก Word มาวางได้เลย ระบบจะแยกข้อให้โดยอัตโนมัติ</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSmartPasteOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">รูปแบบที่รองรับ:</p>
                <code className="text-xs text-slate-600 dark:text-slate-400 block whitespace-pre">
                  1. คำถามข้อที่ 1{'\n'}
                  ก. ตัวเลือกที่ 1{'\n'}
                  ข. ตัวเลือกที่ 2{'\n'}
                  ค. ตัวเลือกที่ 3{'\n'}
                  ง. ตัวเลือกที่ 4
                </code>
              </div>
              <textarea 
                value={smartPasteText}
                onChange={(e) => setSmartPasteText(e.target.value)}
                placeholder="วางข้อความที่นี่..."
                className="w-full h-64 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              ></textarea>
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsSmartPasteOpen(false)}
                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSmartPaste}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                <Wand2 className="w-4 h-4" />
                ประมวลผลแยกคำถาม
              </button>
            </div>
          </div>
        </div>
      )}

      <AIQuizGeneratorModal 
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onQuestionsGenerated={handleAIQuestionsGenerated}
      />
    </div>
  );
}
