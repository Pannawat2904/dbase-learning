"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, BarChart, BookOpen, Send, RotateCcw, Trash2, X, Check } from "lucide-react";
import { sendChatMessage, deleteExamScore, resetStudentProgress, deleteStudentProfile, resetStudentAssignments } from "@/utils/supabase/queries";
import { useRouter } from "next/navigation";

export default function StudentActionsMenu({ student }: { student: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setIsSending(true);
    
    const success = await sendChatMessage(student.id, 'admin', messageText);
    
    setIsSending(false);
    if (success) {
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setIsMessageOpen(false);
        setMessageText("");
      }, 2000);
    } else {
      alert("เกิดข้อผิดพลาด ไม่สามารถส่งข้อความได้");
    }
  };

  const handleResetScore = async (examType: 'pre' | 'post') => {
    const lessonId = examType === 'pre' ? student.preTestId : student.postTestId;
    if (!lessonId) return;
    
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบผลคะแนน ${examType === 'pre' ? 'Pre-test' : 'Post-test'} ของนักเรียนคนนี้? นักเรียนจะสามารถกลับไปทำข้อสอบใหม่ได้`)) {
      const success = await deleteExamScore(student.id, lessonId);
      if (success) {
        alert("ลบผลคะแนนเรียบร้อยแล้ว");
        setIsOpen(false);
        router.refresh();
      } else {
        alert("เกิดข้อผิดพลาดในการลบผลคะแนน");
      }
    }
  };

  const handleResetAllProgress = async () => {
    if (confirm(`คำเตือน: คุณแน่ใจหรือไม่ที่จะ "รีเซ็ตความคืบหน้าทั้งหมด" ของ ${student.name}?\nคะแนนสอบและการเข้าเรียนทั้งหมดจะถูกลบ! (ไม่สามารถกู้คืนได้)`)) {
      const success = await resetStudentProgress(student.id);
      if (success) {
        alert("รีเซ็ตความคืบหน้าเรียบร้อยแล้ว");
        setIsOpen(false);
        router.refresh();
      } else {
        alert("เกิดข้อผิดพลาดในการรีเซ็ตความคืบหน้า");
      }
    }
  };

  const handleResetAssignments = async () => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะล้างค่าการส่งงานปฏิบัติทั้งหมดของ ${student.name}? นักเรียนจะต้องอัปโหลดไฟล์ส่งใหม่ทั้งหมด`)) {
      const success = await resetStudentAssignments(student.id);
      if (success) {
        alert("ล้างสถานะการส่งงานปฏิบัติเรียบร้อยแล้ว");
        setIsOpen(false);
        router.refresh();
      } else {
        alert("เกิดข้อผิดพลาดในการล้างสถานะการส่งงาน");
      }
    }
  };

  const handleDeleteStudent = async () => {
    if (confirm(`อันตราย!: คุณแน่ใจหรือไม่ที่จะ "ลบข้อมูลนักเรียน" ${student.name} ออกจากระบบ?\nข้อมูลทุกอย่างของนักเรียนคนนี้จะถูกลบทั้งหมด! (ไม่สามารถกู้คืนได้)`)) {
      const success = await deleteStudentProfile(student.id);
      if (success) {
        alert("ลบข้อมูลนักเรียนเรียบร้อยแล้ว");
        setIsOpen(false);
        router.refresh();
      } else {
        alert("เกิดข้อผิดพลาดในการลบข้อมูลนักเรียน");
      }
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="py-1">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setIsProgressOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors whitespace-nowrap"
              >
                <BarChart className="w-4 h-4 text-blue-500 shrink-0" />
                ดูรายละเอียดความคืบหน้า
              </button>
              {student.preTestId && (
                <button onClick={() => handleResetScore('pre')} className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-3 transition-colors whitespace-nowrap">
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  ให้ทำ Pre-test ใหม่
                </button>
              )}
              
              {student.postTestId && (
                <button onClick={() => handleResetScore('post')} className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-3 transition-colors whitespace-nowrap">
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  ให้ทำ Post-test ใหม่
                </button>
              )}

              <button 
                onClick={() => {
                  setIsOpen(false);
                  setIsMessageOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors whitespace-nowrap"
              >
                <Send className="w-4 h-4 text-emerald-500 shrink-0" />
                ส่งข้อความ / แจ้งเตือน
              </button>
              <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
              <button 
                onClick={handleResetAssignments}
                className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-3 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                ล้างสถานะส่งงานปฏิบัติ
              </button>
              <button 
                onClick={handleResetAllProgress}
                className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-3 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                รีเซ็ตความคืบหน้าทั้งหมด
              </button>
              <button 
                onClick={handleDeleteStudent}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                ลบข้อมูลนักเรียน
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress Details Modal */}
      {isProgressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart className="w-5 h-5 text-blue-500" />
                รายละเอียดความคืบหน้า
              </h3>
              <button 
                onClick={() => setIsProgressOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <img src={student.avatar_url} alt={student.name} className="w-16 h-16 rounded-full bg-slate-200" />
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-lg">{student.name}</h4>
                  <p className="text-slate-500 text-sm">{student.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">ความคืบหน้าเรียน</p>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{Math.min(100, student.progress)}%</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">เข้าเรียนล่าสุด</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">{student.lastActive}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">Pre-test</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{student.preTest}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">Post-test</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{student.postTest}</p>
                </div>
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={() => setIsProgressOpen(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {isMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-500" />
                ส่งข้อความหานักเรียน
              </h3>
              <button 
                onClick={() => setIsMessageOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">ผู้รับ</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <img src={student.avatar_url} alt={student.name} className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.email}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ข้อความของคุณ</label>
                <textarea 
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  placeholder="พิมพ์ข้อความที่ต้องการส่งให้นักเรียน..."
                ></textarea>
              </div>
              
              <button 
                onClick={handleSendMessage}
                disabled={isSending || !messageText.trim() || sendSuccess}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md shadow-blue-500/20 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : sendSuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    ส่งสำเร็จ
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    ส่งข้อความ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
