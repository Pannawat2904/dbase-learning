"use client";

import { useState, useEffect } from "react";
import { Upload, File, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getStudentAssignments, submitAssignment, saveStudentProgress } from "@/utils/supabase/queries";
import { toast } from "sonner";

export default function AssignmentSubmission({ lesson, courseId }: { lesson: any, courseId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [submittedAssignment, setSubmittedAssignment] = useState<any>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

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
      
      toast.success("ส่งงานเรียบร้อยแล้วครับ!");
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
    <div className="w-full max-w-3xl mx-auto py-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        
        <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">ส่งงานปฏิบัติ: {lesson.title}</h2>
          {lesson.content?.body && (
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300" 
                 dangerouslySetInnerHTML={{ __html: lesson.content.body }} />
          )}
        </div>

        {submittedAssignment ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">คุณได้ส่งงานนี้แล้ว</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex items-center gap-3">
                <File className="w-5 h-5 text-blue-500" />
                <a href={submittedAssignment.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium truncate">
                  {submittedAssignment.file_name}
                </a>
              </div>
              
              {submittedAssignment.student_note && (
                <div className="text-sm text-emerald-700 dark:text-emerald-300">
                  <span className="font-semibold">ข้อความที่แนบไป: </span>
                  {submittedAssignment.student_note}
                </div>
              )}
              
              {submittedAssignment.score !== null ? (
                <div className="mt-6 border-t border-emerald-200 dark:border-emerald-800/50 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300">คะแนนที่ได้:</span>
                    <span className="text-2xl font-bold text-emerald-600">{submittedAssignment.score}</span>
                  </div>
                  {submittedAssignment.teacher_comment && (
                    <div className="mt-3 p-4 bg-white dark:bg-slate-800 rounded-xl text-sm text-slate-600 dark:text-slate-300 border-l-4 border-emerald-500">
                      <span className="font-semibold block mb-1 text-slate-800 dark:text-slate-200">ข้อเสนอแนะจากครู:</span>
                      {submittedAssignment.teacher_comment}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  รอคุณครูตรวจและให้คะแนน
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-emerald-200 dark:border-emerald-800/50 flex justify-center">
              <button 
                onClick={() => window.location.href = '/student/courses'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-8 py-3 rounded-xl shadow-sm transition-colors"
              >
                กลับไปหน้ารวมคอร์ส
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer relative ${
              file 
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}>
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".accdb,.docx,.pdf,.zip"
              />
              {file ? (
                <File className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              ) : (
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
              )}
              <h3 className={`text-lg font-semibold mb-2 ${file ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {file ? file.name : "คลิกหรือลากไฟล์มาวางที่นี่เพื่ออัปโหลด"}
              </h3>
              <p className={`text-sm ${file ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500'}`}>
                {file ? "แนบไฟล์สำเร็จ พร้อมส่งงาน" : "รองรับไฟล์ .accdb, .docx, .pdf, .zip ขนาดไม่เกิน 50MB"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ข้อความถึงคุณครู (ตัวเลือก)</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="พิมพ์ข้อความเพิ่มเติมถึงคุณครู..."
                className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              ></textarea>
            </div>

            <button 
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                !file || isUploading
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังส่งงาน...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  ส่งชิ้นงาน
                </>
              )}
            </button>
            
            <div className="flex gap-2 items-start text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>กรุณาตรวจสอบไฟล์ให้ถูกต้องก่อนกดส่งงาน เมื่อส่งแล้วจะไม่สามารถแก้ไขได้จนกว่าครูจะตีกลับมาให้แก้ไข</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
