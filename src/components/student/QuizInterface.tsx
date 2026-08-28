import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { HelpCircle, Clock, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, RotateCcw, MessageSquare, Award, Lock, ShieldAlert, ShieldX } from "lucide-react";
import { saveExamScore, issueCertificate } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/client";
import { confirmDialog } from "@/components/ui/ConfirmDialog";
import { logExamViolation, VIOLATION_TYPE_CONFIG, ViolationType } from "@/utils/exam-integrity";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'essay';
  options?: string[];
  correctOptionIndex?: number;
  points: number;
}

interface QuizInterfaceProps {
  lesson: any;
  courseId: string;
  moduleId?: string;
  existingScore?: any;
  onComplete?: (isPassed?: boolean) => void;
  onScoreUpdated?: (scoreObj: any) => void;
  onExamStart?: () => void;
  onExamEnd?: () => void;
}

const MAX_ATTEMPTS = 3;

export default function QuizInterface({ lesson, courseId, moduleId, existingScore, onComplete, onScoreUpdated, onExamStart, onExamEnd }: QuizInterfaceProps) {
  const isFormalTest = lesson.type === 'test' || (lesson.title || '').includes('แบบทดสอบ');
  const [hasStarted, setHasStarted] = useState(!isFormalTest);
  const [isFinished, setIsFinished] = useState(!!existingScore);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(existingScore?.answers || {});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [score, setScore] = useState<number>(existingScore?.score || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [earnedCert, setEarnedCert] = useState(false);
  const [examStatus, setExamStatus] = useState<string>(existingScore?.status || 'graded');
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState<number>(existingScore ? 1 : 0);

  // Integrity & Anti-cheating two-strike system state
  const [violationsList, setViolationsList] = useState<{ type: ViolationType; label: string; timestamp: string }[]>([]);
  const [isExamLocked, setIsExamLocked] = useState(existingScore?.status === 'disqualified_cheating');
  const [warningModal, setWarningModal] = useState<{ isOpen: boolean; label: string; timeStr: string } | null>(null);

  const originalQuestions: Question[] = lesson.content?.questions || lesson.questions || [];
  const timeLimit = lesson.content?.timeLimit || lesson.timeLimit || 0; // in minutes
  const passingScore = Number(lesson.content?.passingScore ?? lesson.passingScore ?? 50);
  const totalPoints = existingScore?.total_score || originalQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

  useEffect(() => {
    if (originalQuestions.length > 0 && shuffledQuestions.length === 0) {
      // Shuffle questions
      const shuffled = [...originalQuestions].sort(() => Math.random() - 0.5);
      setShuffledQuestions(shuffled);
    }
  }, [lesson.id, originalQuestions]);

  useEffect(() => {
    // Get student ID and fetch attempts history
    const getStudent = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user ? user.id : "dev-student-123";
      setStudentId(uid);

      // Fetch all score attempts for this student & lesson
      if (user) {
        try {
          const { data: scores } = await supabase
            .from('student_scores')
            .select('*')
            .eq('student_id', uid)
            .eq('lesson_id', lesson.id.toString())
            .neq('exam_type', 'access_log')
            .order('created_at', { ascending: false });

          if (scores && scores.length > 0) {
            setAttemptsCount(scores.length);
            const latest = scores[0];
            setScore(latest.score || 0);
            setAnswers(latest.answers || {});
            setExamStatus(latest.status || 'graded');
            if (latest.status === 'disqualified_cheating') {
              setIsExamLocked(true);
              setIsFinished(true);
            } else if (latest.status === 'in_progress') {
              setIsExamLocked(false);
              setIsFinished(false);
              setHasStarted(true);
            } else {
              setIsFinished(true);
            }
          }
        } catch (err) {
          console.error("Error fetching score attempts:", err);
        }
      }
    };
    getStudent();
  }, [lesson.id]);

  useEffect(() => {
    let timer: any;
    if (hasStarted && !isFinished && !isExamLocked && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0 && !isFinished && !isExamLocked) {
      handleSubmitQuiz();
    }
    return () => clearInterval(timer);
  }, [hasStarted, isFinished, isExamLocked, timeLeft]);

  // Handle anti-cheating violations (1st = Warning, 2nd = Lock Immediately)
  const handleViolation = (type: ViolationType) => {
    if (!hasStarted || isFinished || isExamLocked) return;

    const cfg = VIOLATION_TYPE_CONFIG[type] || VIOLATION_TYPE_CONFIG.tab_switch;
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentAttempt = attemptsCount + 1;

    setViolationsList((prev) => {
      const nextList = [...prev, { type, label: cfg.label, timestamp: timeStr }];
      const count = nextList.length;

      // 1. Log violation to DB
      if (studentId) {
        logExamViolation(studentId, courseId, lesson.id.toString(), type, currentAttempt);
      }

      if (count % 2 === 1) {
        // ⚠️ Strike 1 (or 3, 5): Warning modal and alert
        setWarningModal({
          isOpen: true,
          label: cfg.label,
          timeStr
        });
        const currentLockCount = Math.floor(count / 2);
        toast.error(`⚠️ คำเตือนการทุจริต (ล็อกครั้งที่ ${currentLockCount + 1}): ตรวจพบ ${cfg.label}! หากมีอีก 1 ครั้ง ระบบจะล็อกการสอบทันที!`, {
          duration: 8000
        });
      } else if (count % 2 === 0 && count > 0) {
        // 🚨 Strike 2 (or 4, 6): LOCK IMMEDIATELY!
        setIsExamLocked(true);
        setIsFinished(true);
        setExamStatus('disqualified_cheating');
        setScore(0);
        setWarningModal(null);

        toast.error(`🚨 การสอบถูกระงับ! คุณทำผิดระเบียบครบ 2 ครั้ง ระบบได้ทำการล็อกการสอบและตัดสิทธิ์ทันที`, {
          duration: 12000
        });

        // Save disqualified record to DB
        if (studentId) {
          (async () => {
            try {
              const pts = originalQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
              const explicitType = lesson.content?.examType || lesson.examType || (lesson.title.toLowerCase().includes('post') ? 'post-test' : 'quiz');
              await saveExamScore(
                studentId,
                courseId,
                lesson.id.toString(),
                0,
                pts,
                explicitType,
                answers,
                'disqualified_cheating'
              );

              const supabase = createClient();
              await supabase.from('student_lesson_progress').delete()
                .eq('student_id', studentId)
                .eq('lesson_id', lesson.id.toString());

              if (onScoreUpdated) {
                onScoreUpdated({
                  lesson_id: lesson.id.toString(),
                  score: 0,
                  total_score: pts,
                  exam_type: explicitType,
                  status: 'disqualified_cheating',
                  percentage: 0,
                  passed: false
                });
              }
            } catch (err) {
              console.error("Error saving disqualified score:", err);
            }
          })();
        }
      }

      return nextList;
    });
  };

  // Screen Wake Lock API to prevent screen from sleeping
  const wakeLockRef = useRef<any>(null);
  
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && hasStarted && !isFinished && !isExamLocked) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Wake Lock request failed:', err);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current !== null) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {}
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasStarted && !isFinished && !isExamLocked) {
        requestWakeLock();
      }
    };

    if (hasStarted && !isFinished && !isExamLocked) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [hasStarted, isFinished, isExamLocked]);

  // Anti-cheating event listeners
  useEffect(() => {
    if (!hasStarted || isFinished || isExamLocked) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation('right_click');
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation('copy_attempt');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation('tab_switch');
      }
    };

    const handleWindowBlur = () => {
      handleViolation('window_blur');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault();
        handleViolation('devtools_open');
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasStarted, isFinished, isExamLocked, studentId, courseId, lesson.id, attemptsCount]);

  const handleStart = () => {
    if (shuffledQuestions.length === 0) {
      toast.error("แบบทดสอบนี้ยังไม่มีคำถาม");
      return;
    }
    setHasStarted(true);
    if (timeLimit > 0) {
      setTimeLeft(timeLimit * 60);
    }
    if (onExamStart) onExamStart();
  };

  const handleRetake = () => {
    setIsFinished(false);
    setHasStarted(true);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowReview(false);
    if (originalQuestions.length > 0) {
      setShuffledQuestions([...originalQuestions].sort(() => Math.random() - 0.5));
    }
    if (timeLimit > 0) {
      setTimeLeft(timeLimit * 60);
    }
    if (onExamStart) onExamStart();
  };

  const handleAnswerSelect = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    setIsFinished(true);

    // Calculate score (only for multiple choice, essay needs manual grading but we'll score 0 for now)
    let calculatedScore = 0;
    shuffledQuestions.forEach(q => {
      if (q.type === 'multiple-choice') {
        if (answers[q.id] === q.correctOptionIndex) {
          calculatedScore += (q.points || 1);
        }
      }
    });

    setScore(calculatedScore);

    const nextAttempt = attemptsCount + 1;
    setAttemptsCount(nextAttempt);

    if (studentId) {
      // Determine explicit examType from lesson content or metadata with fallback to title heuristic
      let examType = lesson.content?.examType || lesson.examType;
      if (!examType || !['pre-test', 'post-test', 'quiz'].includes(examType)) {
        const title = (lesson.title || '').toLowerCase();
        if (title.includes('pre') || title.includes('ก่อนเรียน')) {
          examType = 'pre-test';
        } else if (title.includes('post') || title.includes('หลังเรียน')) {
          examType = 'post-test';
        } else {
          examType = 'quiz';
        }
      }

      // Check if there are any essay questions
      const hasEssay = shuffledQuestions.some(q => q.type === 'essay');
      const status = hasEssay ? 'pending' : 'graded';

      await saveExamScore(
        studentId, 
        courseId, 
        lesson.id.toString(), 
        calculatedScore, 
        totalPoints, 
        examType, 
        { ...answers, attempt_number: nextAttempt, max_attempts: MAX_ATTEMPTS }, 
        status
      );
      const percentage = totalPoints > 0 ? Math.round((calculatedScore / totalPoints) * 100) : 0;
      const isPassed = examType !== 'post-test' || percentage >= passingScore;

      // Auto-save progress to student_lesson_progress ONLY if passed (or not a post-test)
      try {
        const supabase = createClient();
        if (isPassed) {
          await supabase.from('student_lesson_progress').upsert({
            student_id: studentId,
            course_id: courseId,
            lesson_id: lesson.id.toString()
          }, { onConflict: 'student_id,lesson_id' });
        } else {
          // If failed post-test, remove from student_lesson_progress so course is NOT completed
          await supabase.from('student_lesson_progress').delete()
            .eq('student_id', studentId)
            .eq('lesson_id', lesson.id.toString());
        }
      } catch (err) {
        console.warn("Error updating lesson progress on quiz submit:", err);
      }

      // Notify parent component about the updated score immediately
      if (onScoreUpdated) {
        onScoreUpdated({
          lesson_id: lesson.id.toString(),
          score: calculatedScore,
          total_score: totalPoints,
          exam_type: examType,
          status,
          percentage,
          passed: isPassed
        });
      }

      // Auto issue certificate if post-test passed
      if (examType === 'post-test' && percentage >= passingScore) {
        try {
          await issueCertificate(studentId, courseId, moduleId);
          await fetch('/api/student/issue-certificate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, courseId, moduleId })
          });
          setEarnedCert(true);
        } catch (certErr) {
          console.warn("Error issuing cert in quiz submit:", certErr);
          setEarnedCert(true);
        }
      }
    }

    setIsSubmitting(false);
    if (onExamEnd) onExamEnd();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!hasStarted && !isFinished) {
    return (
      <div className="w-full h-full min-h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center mb-6">
          <HelpCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
          {lesson.title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 text-sm md:text-base">
          ข้อสอบชุดนี้เพื่อใช้วัดระดับความรู้ความเข้าใจของนักเรียนในหัวข้อนี้
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              ทั้งหมด {shuffledQuestions.length} ข้อ
            </span>
          </div>
          {timeLimit > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-lg text-orange-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">เวลา {timeLimit} นาที</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg text-emerald-600 dark:text-emerald-400">
            <span className="text-sm font-medium">เกณฑ์ผ่าน: {passingScore}%</span>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-xl max-w-lg mb-8 text-left flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
            <p className="font-bold">กฎระเบียบการทำข้อสอบ:</p>
            <ul className="list-disc pl-4 space-y-1 opacity-90">
              <li>ห้ามคลิกขวา หรือคัดลอกข้อความในข้อสอบ</li>
              <li>ห้ามสลับหน้าจอ (Tab) ไปยังโปรแกรมอื่นระหว่างทำข้อสอบ ระบบจะมีการแจ้งเตือนหากตรวจพบ</li>
              {timeLimit > 0 && <li>ระบบจะส่งข้อสอบอัตโนมัติเมื่อหมดเวลา</li>}
              <li>เกณฑ์การสอบผ่านสำหรับบทเรียนนี้คือ {passingScore}%</li>
              <li>สำหรับแบบทดสอบหลังเรียน หากทำไม่ผ่าน สามารถเริ่มทำใหม่ได้ไม่เกิน 3 ครั้ง</li>
            </ul>
          </div>
        </div>

        <button 
          onClick={handleStart}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-xl shadow-sm transition-colors"
        >
          เริ่มทำแบบทดสอบ
        </button>
      </div>
    );
  }

  // 1. Locked & Disqualified Screen (when cheating detected twice or previously locked)
  if (isExamLocked || examStatus === 'disqualified_cheating') {
    return (
      <div className="w-full min-h-[520px] bg-red-50/60 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800/80 rounded-3xl p-8 md:p-12 shadow-xl flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
        <div className="w-24 h-24 rounded-3xl bg-red-600 text-white flex items-center justify-center mb-6 shadow-xl shadow-red-600/30 animate-pulse">
          <ShieldAlert className="w-12 h-12" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold mb-3 border border-red-200 dark:border-red-800">
          <Lock className="w-3.5 h-3.5" /> การสอบถูกระงับและล็อกสิทธิ์ (Exam Locked)
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-red-900 dark:text-red-300 mb-3">
          การสอบถูกระงับเนื่องจากตรวจพบการทุจริตครบ 2 ครั้ง
        </h2>

        <p className="text-slate-600 dark:text-slate-300 max-w-lg mb-6 text-sm sm:text-base leading-relaxed">
          ระบบตรวจพบการละเมิดกฎระเบียบการสอบ (เช่น สลับหน้าจอ, ออกนอกเบราว์เซอร์, คลิกขวา หรือพยายามคัดลอก) ครบ 2 ครั้งในการสอบชุดนี้ ระบบจึงได้ทำการ <strong>ล็อกการสอบและบันทึกคะแนนเป็น 0 ทันที</strong>
        </p>

        {/* Violations Summary Box */}
        {violationsList.length > 0 && (
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-red-200 dark:border-red-900/60 mb-6 text-left shadow-sm">
            <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> บันทึกพฤติกรรมที่ตรวจพบ ({violationsList.length} ครั้ง):
            </h4>
            <div className="space-y-2">
              {violationsList.map((v, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
                  <span className="font-semibold text-red-900 dark:text-red-200">ครั้งที่ {idx + 1}: {v.label}</span>
                  <span className="text-red-500 font-mono text-[11px]">{v.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/student/messages"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>ติดต่อคุณครูผู้สอน</span>
          </Link>
          <Link
            href="/student/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <span>กลับไปหน้ารวมวิชา</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / totalPoints) * 100) || 0;
    const passed = percentage >= passingScore;
    const title = (lesson.title || '').toLowerCase();
    const explicitType = lesson.content?.examType || lesson.examType;
    const isPreTest = explicitType === 'pre-test' || (!explicitType && (title.includes('pre') || title.includes('ก่อนเรียน')));
    const isPostTest = explicitType === 'post-test' || (!explicitType && !isPreTest && (lesson.type === 'test' || title.includes('post') || title.includes('หลังเรียน') || title.includes('ท้ายบท')));
    const attemptsUsed = Math.max(1, attemptsCount);
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attemptsUsed);
    const canRetake = !passed && isPostTest && attemptsLeft > 0;
    const outOfAttempts = !passed && isPostTest && attemptsLeft === 0;

    return (
      <div className={`w-full ${showReview ? 'h-auto' : 'h-full min-h-[500px]'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 shadow-sm flex flex-col ${showReview ? 'items-start' : 'items-center justify-center text-center'}`}>
        <div className={`w-full flex flex-col items-center justify-center text-center transition-all ${showReview ? 'mb-12' : ''}`}>
          
          {/* Attempt Status Badge */}
          {isPostTest && (
            <div className="mb-6 inline-flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300">
                ทำแบบทดสอบไปแล้ว: <strong className="text-blue-600 dark:text-blue-400">{attemptsUsed}/{MAX_ATTEMPTS} ครั้ง</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className={attemptsLeft > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 font-bold"}>
                {attemptsLeft > 0 ? `เหลือโอกาสอีก ${attemptsLeft} ครั้ง` : "ใช้สิทธิ์ครบแล้ว"}
              </span>
            </div>
          )}

          {isPreTest && existingScore && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              คุณได้ทำแบบทดสอบนี้ไปแล้ว
            </div>
          )}
        
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 ${
          examStatus === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-500' :
          isPreTest ? 'bg-blue-50 border-blue-100 text-blue-500' :
          passed ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-red-50 border-red-100 text-red-500'
        } dark:bg-opacity-10 dark:border-opacity-20`}>
          {examStatus === 'pending' ? <Clock className="w-12 h-12" /> :
           isPreTest ? <CheckCircle2 className="w-12 h-12" /> :
           passed ? <CheckCircle2 className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
        </div>
        
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
          {examStatus === 'pending' ? 'รอการตรวจให้คะแนน' :
           isPreTest ? 'ทำแบบทดสอบก่อนเรียนเสร็จสิ้น' : 
           passed ? 'ยินดีด้วย! คุณสอบผ่าน' : 'ผลการทดสอบ: ยังไม่ผ่านเกณฑ์'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {examStatus === 'pending' 
            ? 'ข้อสอบของคุณถูกส่งไปยังผู้สอนแล้ว กรุณารอผลการตรวจคะแนน' 
            : `คุณได้คะแนน ${score} / ${totalPoints} คะแนน ${isPreTest ? '' : `(${percentage}%) — เกณฑ์ผ่านคือ ${passingScore}%`}`}
        </p>

        {/* Post-test 3-Attempt Indicators */}
        {isPostTest && !passed && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((num) => {
              const isCurrent = num === attemptsUsed;
              const isPast = num <= attemptsUsed;
              return (
                <div 
                  key={num} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    isPast 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  <span>ครั้งที่ {num}</span>
                  {isPast ? <span>(ไม่ผ่าน)</span> : <span>(ว่าง)</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Certificate Banner when Passed */}
        {earnedCert && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl animate-in fade-in zoom-in duration-500">
            <h3 className="font-bold text-amber-600 dark:text-amber-400 mb-2">🎉 ยินดีด้วย! คุณได้รับใบประกาศนียบัตร</h3>
            <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mb-4">
              คุณเรียนจบหลักสูตรและสอบผ่านเกณฑ์ที่กำหนดแล้ว สามารถไปดูใบประกาศนียบัตรของคุณได้เลย
            </p>
            <button
              onClick={() => window.location.href = '/student/certificates'}
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2 rounded-lg shadow-sm transition-colors text-sm"
            >
              ดูใบประกาศนียบัตร
            </button>
          </div>
        )}

        {/* Out of Attempts Alert */}
        {outOfAttempts && (
          <div className="mb-8 p-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl text-left max-w-lg mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-300 space-y-1">
                <p className="font-bold text-base">คุณใช้สิทธิ์ทำแบบทดสอบครบ 3 ครั้งแล้ว</p>
                <p className="text-xs text-red-600/90 dark:text-red-400 leading-relaxed">
                  คุณทำแบบทดสอบหลังเรียนครบตามโควต้าที่ระบบกำหนดแล้ว (3/3 ครั้ง) หากต้องการสอบแก้ตัวหรือขอคำปรึกษาเพิ่มเติม กรุณาส่งข้อความหาคุณครูผู้สอนผ่านระบบกล่องข้อความ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          
          {/* Retake Button (Allowed only if failed and has attempts left <= 3) */}
          {canRetake && (
            <button 
              onClick={handleRetake}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>เริ่มทำแบบทดสอบใหม่ (ครั้งที่ {attemptsUsed + 1}/{MAX_ATTEMPTS})</span>
            </button>
          )}

          {/* Contact Teacher Button when out of attempts */}
          {outOfAttempts && (
            <Link
              href="/student/messages"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>ส่งข้อความถึงคุณครู</span>
            </Link>
          )}

          {/* Return / Proceed Button */}
          <button 
            onClick={() => onComplete?.(isPostTest ? ((score / totalPoints) * 100 >= passingScore) : true)}
            className={`font-medium px-8 py-3.5 rounded-2xl transition-all ${
              canRetake 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200' 
                : 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-sm'
            }`}
          >
            {isPreTest ? 'เข้าสู่บทเรียน' : 'กลับไปหน้าบทเรียน'}
          </button>
        </div>

          {!isPreTest && !showReview && (
            <button 
              onClick={() => setShowReview(true)}
              className="mt-6 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors underline"
            >
              ดูเฉลยและข้อที่ตอบผิด
            </button>
          )}
        </div>

        {showReview && (
          <div className="w-full mt-8 text-left border-t border-slate-200 dark:border-slate-700 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">เฉลยแบบทดสอบ</h3>
            <div className="space-y-4">
              {shuffledQuestions.map((q, idx) => {
                const isCorrect = answers[q.id] === q.correctOptionIndex;
                return (
                  <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10' : 'border-red-200 bg-red-50 dark:bg-red-900/10'}`}>
                    <div className="flex gap-3">
                      <div className="mt-1 shrink-0">
                        {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 dark:text-white mb-3">{idx + 1}. {q.text}</p>
                        {q.type === 'multiple-choice' && q.options && (
                          <div className="space-y-2 text-sm">
                            <p className="text-slate-600 dark:text-slate-400">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">คำตอบของคุณ:</span> {answers[q.id] !== undefined ? q.options[answers[q.id]] : 'ไม่ได้ตอบ'}
                            </p>
                            {!isCorrect && q.correctOptionIndex !== undefined && (
                              <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                                <span className="font-semibold">เฉลยที่ถูกต้อง:</span> {q.options[q.correctOptionIndex]}
                              </p>
                            )}
                          </div>
                        )}
                        {q.type === 'essay' && (
                          <div className="text-sm">
                            <p className="text-slate-600 dark:text-slate-400">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">คำตอบของคุณ:</span> {answers[q.id] || 'ไม่ได้ตอบ'}
                            </p>
                            <p className="text-amber-600 dark:text-amber-500 mt-1 text-xs">รอผู้สอนตรวจให้คะแนน</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentQ = shuffledQuestions[currentQuestionIndex];
  if (!currentQ) return null;

  return (
    <div className="w-full min-h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-sm flex flex-col relative user-select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-lg">
            ข้อ {currentQuestionIndex + 1} / {shuffledQuestions.length}
          </span>
          <span className="text-sm text-slate-500">
            ({currentQ.points || 1} คะแนน)
          </span>
        </div>
        
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${
            timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Question Body */}
      <div className="flex-1 mb-8">
        <h3 className="text-lg md:text-xl font-medium text-slate-800 dark:text-white mb-6 leading-relaxed">
          {currentQ.text}
        </h3>

        {currentQ.type === 'multiple-choice' && currentQ.options && (
          <div className="space-y-3">
            {currentQ.options.map((opt, idx) => (
              <label 
                key={idx}
                onClick={() => handleAnswerSelect(currentQ.id, idx)}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  answers[currentQ.id] === idx 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  answers[currentQ.id] === idx 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {answers[currentQ.id] === idx && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <span className="text-slate-700 dark:text-slate-300 text-sm md:text-base">
                  {opt}
                </span>
              </label>
            ))}
          </div>
        )}

        {currentQ.type === 'essay' && (
          <textarea 
            value={answers[currentQ.id] || ''}
            onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
            placeholder="พิมพ์คำตอบของคุณที่นี่..."
            className="w-full h-40 p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none transition-all"
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-auto">
        <button
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> กลับ
        </button>

        {currentQuestionIndex === shuffledQuestions.length - 1 ? (
          <button
            onClick={async () => {
              const confirmed = await confirmDialog({
                title: "ยืนยันการส่งข้อสอบ",
                message: "คุณแน่ใจหรือไม่ที่จะส่งข้อสอบ? (เมื่อส่งแล้วจะไม่สามารถแก้ไขคำตอบได้)",
                type: "warning",
                confirmText: "ส่งข้อสอบ",
                cancelText: "ตรวจทานอีกครั้ง"
              });
              if (confirmed) {
                handleSubmitQuiz();
              }
            }}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-70 transition-colors shadow-sm shadow-blue-500/30"
          >
            ส่งข้อสอบ <CheckCircle2 className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.min(shuffledQuestions.length - 1, prev + 1))}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-slate-800 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity shadow-sm"
          >
            ข้อต่อไป <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ⚠️ Warning Modal for 1st Violation Strike */}
      {warningModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-300 dark:border-amber-700 shadow-md shadow-amber-500/20 animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2">
              ⚠️ คำเตือนการทุจริต (ครั้งที่ 1/2)
            </div>

            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              ตรวจพบพฤติกรรมผิดระเบียบการสอบ!
            </h3>

            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
              {warningModal.label}
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 text-left mb-6 space-y-1.5">
              <p className="font-bold text-amber-800 dark:text-amber-300">⚠️ ข้อควรระวัง (เหลือโอกาสอีก 0 ครั้ง):</p>
              <p className="leading-relaxed">
                นี่คือการแจ้งเตือนครั้งที่ 1 หากตรวจพบการสลับหน้าจอ, ออกนอกเบราว์เซอร์, คลิกขวา, คัดลอก หรือเปิดเครื่องมือผู้พัฒนาอีก <strong>เพียง 1 ครั้ง ระบบจะทำการล็อกการสอบและตัดสิทธิ์ทันทีโดยได้ 0 คะแนน!</strong>
              </p>
            </div>

            <button
              onClick={() => setWarningModal(null)}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              รับทราบและกลับไปทำข้อสอบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
