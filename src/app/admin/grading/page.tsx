"use client";

import { useState, useEffect } from "react";
import { getPendingEssays, updateEssayScore, getPendingAssignments, gradeAssignment } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, AlertCircle, FileEdit, User, BookOpen, Download, File, MessageSquare, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function GradingPage() {
  const [activeTab, setActiveTab] = useState<'essay' | 'assignment'>('essay');
  const [pendingExams, setPendingExams] = useState<any[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [assignmentScore, setAssignmentScore] = useState<number | ''>('');
  const [teacherComment, setTeacherComment] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [studentAvatars, setStudentAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [examsData, assignmentsData] = await Promise.all([
      getPendingEssays(),
      getPendingAssignments()
    ]);
    
    setPendingExams(examsData || []);
    setPendingAssignments(assignmentsData || []);
    
    // Fetch student names for display
    const supabase = createClient();
    const { data: users } = await supabase.from('profiles').select('id, full_name, avatar_url');
    if (users) {
      const names: Record<string, string> = {};
      const avatars: Record<string, string> = {};
      users.forEach((u: any) => {
        names[u.id] = u.full_name || 'ไม่ระบุชื่อ';
        if (u.avatar_url) avatars[u.id] = u.avatar_url;
      });
      setStudentNames(names);
      setStudentAvatars(avatars);
    }
    
    setLoading(false);
  };

  const handleSelectExam = (exam: any) => {
    setSelectedExam(exam);
    setScores({});
  };
  
  const handleSelectAssignment = (assignment: any) => {
    setSelectedAssignment(assignment);
    setAssignmentScore('');
    setTeacherComment('');
  };

  const handleSubmitScore = async () => {
    if (!selectedExam) return;
    
    setIsSubmitting(true);
    let totalAddedScore = 0;
    
    const questions = selectedExam.lesson?.content?.questions || [];
    questions.forEach((q: any) => {
      if (q.type === 'essay' && scores[q.id] !== undefined) {
        totalAddedScore += scores[q.id];
      }
    });

    const toastId = toast.loading("กำลังบันทึกคะแนน...");
    const success = await updateEssayScore(selectedExam.id, totalAddedScore);
    
    if (success) {
      toast.success("บันทึกคะแนนสำเร็จ!", { id: toastId });
      setSelectedExam(null);
      fetchData();
    } else {
      toast.error("เกิดข้อผิดพลาดในการบันทึกคะแนน", { id: toastId });
    }
    setIsSubmitting(false);
  };
  
  const handleSubmitAssignmentScore = async () => {
    if (!selectedAssignment) return;
    if (assignmentScore === '') {
      toast.error("กรุณาระบุคะแนน");
      return;
    }
    
    setIsSubmitting(true);
    const toastId = toast.loading("กำลังบันทึกคะแนน...");
    const success = await gradeAssignment(selectedAssignment.id, Number(assignmentScore), teacherComment);
    
    if (success) {
      toast.success("บันทึกคะแนนสำเร็จ!", { id: toastId });
      setSelectedAssignment(null);
      fetchData();
    } else {
      toast.error("เกิดข้อผิดพลาดในการบันทึกคะแนน", { id: toastId });
    }
    setIsSubmitting(false);
  };

  const activeList = activeTab === 'essay' ? pendingExams : pendingAssignments;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">ตรวจงานและข้อสอบ</h1>
          <p className="text-slate-500 dark:text-slate-400">รายการงานปฏิบัติและข้อสอบที่รอการตรวจและให้คะแนน</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('essay'); setSelectedExam(null); setSelectedAssignment(null); }}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              activeTab === 'essay' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ข้อสอบอัตนัย ({pendingExams.length})
          </button>
          <button
            onClick={() => { setActiveTab('assignment'); setSelectedExam(null); setSelectedAssignment(null); }}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              activeTab === 'assignment' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            งานปฏิบัติ ({pendingAssignments.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List of Pending Items */}
        <div className={`lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm ${selectedExam || selectedAssignment ? 'hidden lg:block' : 'block'}`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              รอการตรวจ ({activeList.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
          ) : activeList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 opacity-50" />
              <p>ไม่มีงานที่รอการตรวจ</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {activeList.map((item) => {
                const isSelected = activeTab === 'essay' ? selectedExam?.id === item.id : selectedAssignment?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => activeTab === 'essay' ? handleSelectExam(item) : handleSelectAssignment(item)}
                    className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {studentAvatars[item.student_id] ? (
                        <img src={studentAvatars[item.student_id]} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                        {studentNames[item.student_id] || 'Student'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {item.lesson?.title || 'Lesson'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {new Date(item.created_at).toLocaleString('th-TH')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Grading Panel */}
        <div className={`lg:col-span-2 ${selectedExam || selectedAssignment ? 'block' : 'hidden lg:block'}`}>
          {activeTab === 'essay' && selectedExam ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-start gap-3">
                <button 
                  onClick={() => setSelectedExam(null)}
                  className="lg:hidden p-2 -ml-2 mt-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                    กำลังตรวจข้อสอบของ: {studentNames[selectedExam.student_id] || 'Student'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedExam.course?.title} - {selectedExam.lesson?.title}
                  </p>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[600px] space-y-8">
                {selectedExam.lesson?.content?.questions?.map((q: any, index: number) => {
                  if (q.type !== 'essay') return null;
                  
                  const answer = selectedExam.answers?.[q.id] || "ไม่ได้ตอบ";
                  
                  return (
                    <div key={q.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-slate-800">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg">
                          ข้อที่ {index + 1}: {q.text}
                        </h3>
                        <div className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                          {q.points || 1} คะแนน
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-6 text-slate-700 dark:text-slate-300 min-h-[100px] whitespace-pre-wrap">
                        {answer}
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label className="font-medium text-slate-700 dark:text-slate-300">
                          ให้คะแนนข้อนี้:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={q.points || 1}
                          value={scores[q.id] || ''}
                          onChange={(e) => setScores({ ...scores, [q.id]: parseInt(e.target.value) || 0 })}
                          className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="0"
                        />
                        <span className="text-sm text-slate-500">/ {q.points || 1} คะแนน</span>
                      </div>
                    </div>
                  );
                })}

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-white">คะแนนรวมที่ได้</h4>
                    <p className="text-sm text-slate-500">คะแนนปรนัยเดิม: {selectedExam.score} คะแนน</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedExam.score + Object.values(scores).reduce((a, b) => a + b, 0)}
                    </span>
                    <span className="text-slate-500"> / {selectedExam.total_score}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedExam(null)}
                    className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSubmitScore}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : <><FileEdit className="w-4 h-4" />บันทึกคะแนน</>}
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'assignment' && selectedAssignment ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-start gap-3">
                <button 
                  onClick={() => setSelectedAssignment(null)}
                  className="lg:hidden p-2 -ml-2 mt-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                    กำลังตรวจงานปฏิบัติของ: {studentNames[selectedAssignment.student_id] || 'Student'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedAssignment.lesson?.title}
                  </p>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[600px] space-y-8">
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-slate-800">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg mb-4 flex items-center gap-2">
                    <File className="w-5 h-5 text-blue-500" />
                    ไฟล์ที่ส่ง
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg flex items-center justify-between border border-slate-200 dark:border-slate-700">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[70%]">
                      {selectedAssignment.file_name}
                    </span>
                    <a
                      href={`${selectedAssignment.file_url}?download=${encodeURIComponent(selectedAssignment.file_name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      ดาวน์โหลด
                    </a>
                  </div>
                  
                  {selectedAssignment.student_note && (
                    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                        ข้อความจากนักเรียน
                      </h4>
                      <div className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                        {selectedAssignment.student_note}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-slate-700 dark:text-slate-300">
                      ให้คะแนน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={assignmentScore}
                      onChange={(e) => setAssignmentScore(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-32 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-lg font-semibold"
                      placeholder="0"
                      required
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="font-medium text-slate-700 dark:text-slate-300">
                      ข้อเสนอแนะถึงนักเรียน (ตัวเลือก)
                    </label>
                    <textarea
                      value={teacherComment}
                      onChange={(e) => setTeacherComment(e.target.value)}
                      className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                      placeholder="พิมพ์ข้อเสนอแนะเพื่อให้เด็กนำไปปรับปรุง..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSubmitAssignmentScore}
                    disabled={isSubmitting || assignmentScore === ''}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium shadow-sm flex items-center gap-2 transition-colors"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : <><FileEdit className="w-4 h-4" />บันทึกคะแนน</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <FileEdit className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">เลือกรายการเพื่อตรวจ</h3>
              <p className="text-slate-500 max-w-md">
                คลิกเลือกรายชื่อนักเรียนจากรายการด้านซ้ายเพื่ออ่านคำตอบหรือดาวน์โหลดไฟล์และให้คะแนน
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
