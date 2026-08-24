"use client";

import { useState, useEffect } from "react";
import { Upload, File, CheckCircle2, Loader2, AlertCircle, Award, Calendar, FileCheck, Paperclip, Download, ExternalLink, CheckSquare, RotateCcw, MessageSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getStudentAssignments, submitAssignment, saveStudentProgress } from "@/utils/supabase/queries";
import { toast } from "sonner";

export default function AssignmentSubmission({ lesson, courseId }: { lesson: any, courseId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [submittedAssignment, setSubmittedAssignment] = useState<any>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);

  const maxScore = lesson.content?.maxScore || 10;
  const dueDate = lesson.content?.dueDate || null;
  const allowedFileTypes = lesson.content?.allowedFileTypes || ".accdb, .sql, .pdf, .zip, .docx";
  const worksheetFileUrl = lesson.content?.worksheetFileUrl || lesson.content?.worksheetUrl || null;
  const worksheetFileName = lesson.content?.worksheetFileName || "เอกสารใบงาน_โจทย์งานปฏิบัติ";
  const rubric = lesson.content?.rubric || null;

  useEffect(() => {
    const fetchAssignment = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentId(user.id);
        const assignments = await getStudentAssignments(user.id, lesson.id.toString());
        if (assignments && assignments.length > 0) {
          setSubmittedAssignment(assignments[0]);
        }
      } else {
        setStudentId("dev-student-123");
      }
    };
    fetchAssignment();
  }, [lesson.id]);

  const handleUpload = async () => {
    if (!file || !studentId) {
      toast.warning("กรุณาเลือกไฟล์ก่อนส่งงานครับ");
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentId}_${lesson.id}_${Date.now()}.${fileExt}`;
    const filePath = `${courseId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('assignments')
      .upload(filePath, file);

    if (uploadError) {
      toast.error(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${uploadError.message}`);
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('assignments')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;

    const success = await submitAssignment(studentId, lesson.id.toString(), fileUrl, file.name, note);
    
    if (success) {
      // Mark this lesson as progressed/completed
      await saveStudentProgress(studentId, courseId, lesson.id.toString());
      
      toast.success("ส่งงานปฏิบัติเรียบร้อยแล้วครับ!");
      setIsResubmitting(false);
      setFile(null);
      const assignments = await getStudentAssignments(studentId, lesson.id.toString());
      if (assignments && assignments.length > 0) {
        setSubmittedAssignment(assignments[0]);
      }
    } else {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูลการส่งงาน");
    }
    setIsUploading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 space-y-6">
      
      {/* 1. Assignment Brief Card */}
      <div className="vision-glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm space-y-6">
        
        {/* Title & Badges */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">
              <Upload className="w-3.5 h-3.5" /> งานปฏิบัติการ (Assignment)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Award className="w-3.5 h-3.5" /> คะแนนเต็ม {maxScore} คะแนน
            </span>
            {dueDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" /> กำหนดส่ง: {new Date(dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <FileCheck className="w-3.5 h-3.5" /> ไฟล์: {allowedFileTypes}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            {lesson.title}
          </h2>
        </div>

        {/* Detailed Instructions (HTML Body) */}
        {lesson.content?.body ? (
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>📋 คำสั่งและรายละเอียดงานปฏิบัติ</span>
            </h3>
            <div 
              className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 text-sm leading-relaxed space-y-3" 
              dangerouslySetInnerHTML={{ __html: lesson.content.body }} 
            />
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500">
            ให้นักเรียนปฏิบัติตามคำสั่งที่คุณครูมอบหมาย และอัปโหลดไฟล์ผลงานเพื่อส่งตรวจ
          </div>
        )}

        {/* Downloadable Reference File / Worksheet Attachment */}
        {worksheetFileUrl && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">เอกสารใบงาน / ไฟล์เทมเพลตประกอบ</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-md">{worksheetFileName}</p>
              </div>
            </div>
            
            <a 
              href={worksheetFileUrl} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดเอกสารใบงาน</span>
            </a>
          </div>
        )}

        {/* Rubrics / Scoring Criteria Box */}
        {rubric && (
          <div className="bg-teal-50/70 dark:bg-teal-950/20 p-5 rounded-2xl border border-teal-200 dark:border-teal-800/40 space-y-2">
            <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
              <CheckSquare className="w-4 h-4" />
              <span>เกณฑ์การให้คะแนน (Scoring Rubric)</span>
            </div>
            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
              {rubric}
            </pre>
          </div>
        )}
      </div>

      {/* 2. Submission & Feedback Area */}
      <div className="vision-glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm">
        
        {submittedAssignment && !isResubmitting ? (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-200/60 dark:border-emerald-800/40">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">คุณได้ส่งงานปฏิบัตินี้เรียบร้อยแล้ว</h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    ส่งเมื่อ {new Date(submittedAssignment.created_at).toLocaleDateString('th-TH', { 
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsResubmitting(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ส่งไฟล์ใหม่อีกครั้ง</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between gap-3 border border-emerald-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-800 dark:text-white truncate">
                    {submittedAssignment.file_name}
                  </span>
                </div>
                <a 
                  href={submittedAssignment.file_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 shrink-0 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg"
                >
                  <span>เปิดดูไฟล์</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              
              {submittedAssignment.student_note && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 p-3.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">ข้อความของคุณ: </span>
                  {submittedAssignment.student_note}
                </div>
              )}
              
              {/* Grading Status & Feedback */}
              {submittedAssignment.score !== null ? (
                <div className="mt-6 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">ผลการตรวจและคะแนนที่ได้:</span>
                    <div className="text-right">
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{submittedAssignment.score}</span>
                      <span className="text-sm text-slate-400"> / {maxScore} คะแนน</span>
                    </div>
                  </div>
                  {submittedAssignment.teacher_comment && (
                    <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl text-xs text-slate-700 dark:text-slate-300 border-l-4 border-emerald-500">
                      <span className="font-bold block mb-1 text-emerald-900 dark:text-emerald-300">ข้อเสนอแนะจากคุณครู:</span>
                      {submittedAssignment.teacher_comment}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800/40">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
                  <span>งานของคุณถูกส่งเข้าระบบเรียบร้อยแล้ว อยู่ระหว่างรอคุณครูตรวจและให้คะแนน</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {isResubmitting ? "ส่งงานใหม่อีกครั้ง (Resubmit)" : "อัปโหลดไฟล์ส่งงาน"}
              </h3>
              {isResubmitting && (
                <button
                  onClick={() => setIsResubmitting(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
                >
                  ยกเลิก
                </button>
              )}
            </div>

            {/* Drag and Drop Zone */}
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer relative ${
              file 
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20' 
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}>
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept={allowedFileTypes.replace(/\s+/g, '')}
              />
              {file ? (
                <File className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              ) : (
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              )}
              <h4 className={`text-base font-bold mb-1 ${file ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {file ? file.name : "คลิกหรือลากไฟล์ผลงานมาวางที่นี่"}
              </h4>
              <p className={`text-xs ${file ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500'}`}>
                {file ? `ขนาดไฟล์: ${(file.size / (1024 * 1024)).toFixed(2)} MB • พร้อมส่งงาน` : `รองรับไฟล์: ${allowedFileTypes} (ขนาดไม่เกิน 50MB)`}
              </p>
            </div>

            {/* Note to Teacher */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ข้อความหรือคำอธิบายเพิ่มเติมถึงคุณครู (Optional)
              </label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น ส่งงานแล็บ 1 ครับ ได้สร้างตารางและคีย์หลักเรียบร้อยตามโจทย์..."
                className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm min-h-[90px]"
              ></textarea>
            </div>

            {/* Submit Button */}
            <button 
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                !file || isUploading
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>กำลังอัปโหลดและส่งงาน...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>{isResubmitting ? "ยืนยันการส่งไฟล์ใหม่" : "ยืนยันการส่งงานปฏิบัติ"}</span>
                </>
              )}
            </button>
            
            <div className="flex gap-2 items-start text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/40">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>กรุณาตรวจสอบความถูกต้องของไฟล์ก่อนกดส่ง เมื่อส่งแล้วระบบจะบันทึกเวลาส่งและแจ้งเตือนไปยังคุณครูผู้สอนทันที</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
