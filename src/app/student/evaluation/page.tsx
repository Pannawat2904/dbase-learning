"use client";

import { useState, useEffect } from "react";
import { 
  Star, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Send, 
  ArrowLeft,
  Info,
  ShieldCheck,
  HelpCircle
} from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";
import surveyData from "@/data/satisfaction-survey.json";

export default function StudentEvaluationPage() {
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [surveyConfig, setSurveyConfig] = useState<any>({
    title: "แบบประเมินความพึงพอใจต่อการใช้งานระบบเรียนรู้วิชาโปรแกรมฐานข้อมูลอัจฉริยะ (DBASE Learning AI)",
    description: "คำชี้แจง: โปรดเลือกคะแนนระดับความพึงพอใจที่ตรงกับความคิดเห็นของท่านมากที่สุด โดยแบ่งเป็น 5 ระดับ (5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด)",
    scaleLevels: [
      { value: 5, label: "มากที่สุด" },
      { value: 4, label: "มาก" },
      { value: 3, label: "ปานกลาง" },
      { value: 2, label: "น้อย" },
      { value: 1, label: "น้อยที่สุด" }
    ],
    dimensions: []
  });
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const dimensions = surveyConfig.dimensions || [];
  const allItems = dimensions.flatMap((d: any) => d.items || []);
  const totalQuestions = allItems.length;
  const answeredCount = Object.keys(ratings).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/survey', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load survey');
      const data = await res.json();
      setIsOpen(Boolean(data.isOpen));
      setIsSubmitted(Boolean(data.isSubmitted));
      setSubmissionData(data.submission);
      if (data.title || data.dimensions) {
        setSurveyConfig({
          title: data.title || "แบบประเมินความพึงพอใจ",
          description: data.description || "",
          scaleLevels: data.scaleLevels || [
            { value: 5, label: "มากที่สุด" },
            { value: 4, label: "มาก" },
            { value: 3, label: "ปานกลาง" },
            { value: 2, label: "น้อย" },
            { value: 1, label: "น้อยที่สุด" }
          ],
          dimensions: data.dimensions || []
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถโหลดข้อมูลแบบประเมินได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRatingChange = (itemId: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [itemId]: value
    }));
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answeredCount < totalQuestions) {
      setErrorMsg(`กรุณาตอบแบบประเมินให้ครบทุกข้อ (ตอบแล้ว ${answeredCount}/${totalQuestions} ข้อ)`);
      // Scroll to first unanswered item
      const firstUnanswered = allItems.find((item: any) => !ratings[item.id]);
      if (firstUnanswered) {
        document.getElementById(`item-${firstUnanswered.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      // Calculate dimension averages
      const dimensionScores: Record<string, number> = {};
      dimensions.forEach((dim: any) => {
        const dimItemScores = (dim.items || []).map((it: any) => ratings[it.id] || 0);
        if (dimItemScores.length > 0) {
          const avg = dimItemScores.reduce((a: number, b: number) => a + b, 0) / dimItemScores.length;
          dimensionScores[dim.id] = Number(avg.toFixed(2));
        }
      });

      const allScores = Object.values(ratings);
      const overallAverage = Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2));

      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratings,
          dimensionScores,
          suggestions,
          overallAverage
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งแบบประเมิน");

      // Success
      setIsSubmitted(true);
      setSubmissionData({
        score: overallAverage,
        answers: { overallAverage, suggestions }
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setErrorMsg(err.message || "ไม่สามารถส่งแบบประเมินได้");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse py-8">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-2/3"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2"></div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  // 1. LOCKED STATE (ระบบยังไม่เปิดให้ทำ)
  if (!isOpen && !isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-200 dark:border-amber-800/40 animate-bounce duration-1000">
            <Lock className="w-10 h-10" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 mb-4">
            <AlertCircle className="w-3.5 h-3.5" />
            ยังไม่เปิดรับการประเมิน
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-3">
            แบบประเมินความพึงพอใจถูกล็อคไว้
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-8">
            คุณครูผู้สอนยังไม่ได้เปิดให้ทำแบบประเมินในขณะนี้ กรุณารอคุณครูผู้สอนแจ้งเปิดระบบเพื่อเข้าทำแบบประเมินความพึงพอใจ
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/student/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-2xl shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับสู่หน้าภาพรวมการเรียน
            </Link>
            <button
              onClick={fetchStatus}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-2xl transition-colors"
            >
              ตรวจสอบสถานะใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. EMPTY STATE (เปิดแล้ว แต่ยังไม่มีข้อคำถาม)
  if (isOpen && !isSubmitted && dimensions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-200 dark:border-blue-800/40">
            <HelpCircle className="w-10 h-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-3">
            ยังไม่มีรายการประเมินในระบบ
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-8">
            คุณครูผู้สอนกำลังจัดเตรียมส่วนและข้อคำถามการประเมินความพึงพอใจ กรุณากลับมาใหม่อีกครั้ง
          </p>

          <div className="flex justify-center gap-3">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-2xl shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับสู่หน้าหลัก
            </Link>
            <button
              onClick={fetchStatus}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-2xl transition-colors"
            >
              รีเฟรช
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. COMPLETED STATE (นักเรียนส่งแบบประเมินแล้ว)
  if (isSubmitted) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 sm:p-16 max-w-2xl w-full text-center shadow-2xl shadow-blue-500/5 relative overflow-hidden">
          {/* Decorative background blur */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30 transform hover:scale-105 transition-transform duration-300">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-6 border border-emerald-100 dark:border-emerald-800/50">
              <Sparkles className="w-4 h-4" />
              ส่งแบบประเมินสำเร็จ
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tight">
              ขอบคุณสำหรับความคิดเห็น
            </h1>

            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-10">
              ระบบได้บันทึกผลการประเมินของคุณเรียบร้อยแล้ว ข้อมูลนี้จะถูกนำไปพัฒนาและปรับปรุงระบบการเรียนรู้ให้ดียิ่งขึ้นครับ
            </p>

            <div>
              <Link
                href="/student/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-2xl shadow-xl transition-all hover:-translate-y-1"
              >
                <ArrowLeft className="w-5 h-5" />
                กลับสู่หน้าหลัก
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. OPEN SURVEY FORM (เปิดให้ทำแบบประเมิน)
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 pb-24 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-slate-900/15 relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white mb-3">
            <Star className="w-3.5 h-3.5 fill-white" />
            แบบประเมินความพึงพอใจ
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-normal leading-snug mb-3">
            {surveyConfig.title}
          </h1>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl">
            {surveyConfig.description}
          </p>

          {/* Rating Scale Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-6 pt-6 border-t border-white/20 text-xs">
            {surveyConfig.scaleLevels.map((lvl: any) => (
              <div key={lvl.value} className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
                <span className="font-bold text-base block text-amber-300">{lvl.value} คะแนน</span>
                <span className="text-white/90">{lvl.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Progress Bar */}
      <div className="sticky top-4 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            <span>ความคืบหน้าการตอบแบบประเมิน</span>
            <span className="text-blue-600 dark:text-blue-400">{answeredCount} จาก {totalQuestions} ข้อ ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 p-4 rounded-2xl flex items-center gap-3 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Questions by Dimension */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {dimensions.map((dim: any, dimIdx: number) => (
          <div 
            key={dim.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
          >
            {/* Dimension Title */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-extrabold flex items-center justify-center shrink-0">
                  {dimIdx + 1}
                </span>
                {dim.title}
              </h2>
              {dim.description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 pl-9">
                  {dim.description}
                </p>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800/60">
              {(dim.items || []).map((item: any, itemIdx: number) => {
                const currentRating = ratings[item.id];
                return (
                  <div 
                    key={item.id} 
                    id={`item-${item.id}`}
                    className={`pt-5 first:pt-0 rounded-2xl transition-colors p-3 ${!currentRating && errorMsg ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}
                  >
                    <div className="mb-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                        {item.text}
                      </p>
                    </div>

                    {/* 5-Level Rating Buttons */}
                    <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-xl">
                      {surveyConfig.scaleLevels.map((lvl: any) => {
                        const isSelected = currentRating === lvl.value;
                        return (
                          <button
                            type="button"
                            key={lvl.value}
                            onClick={() => handleRatingChange(item.id, lvl.value)}
                            className={`
                              flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all
                              ${isSelected 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-105 font-bold' 
                                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'}
                            `}
                          >
                            <span className={`text-base sm:text-lg font-bold mb-0.5 ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                              {lvl.value}
                            </span>
                            <span className={`text-[10px] sm:text-xs truncate max-w-full px-1 ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              {lvl.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Additional Suggestions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            ข้อเสนอแนะและข้อคิดเห็นเพิ่มเติม (ถ้ามี)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            โปรดระบุข้อเสนอแนะ หรือสิ่งที่ท่านต้องการให้ปรับปรุงเพิ่มเติมในระบบ DBASE Learning AI
          </p>
          <textarea
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            rows={4}
            placeholder="พิมพ์ความคิดเห็น หรือข้อเสนอแนะของท่านที่นี่..."
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
          />
        </div>

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            * เมื่อส่งแบบประเมินแล้ว จะไม่สามารถแก้ไขคะแนนได้อีก
          </p>
          <button
            type="submit"
            disabled={submitting}
            className={`
              w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-bold text-white shadow-xl transition-all
              ${submitting 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 hover:shadow-2xl hover:scale-[1.02]'}
            `}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                กำลังส่งแบบประเมิน...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                ส่งแบบประเมินความพึงพอใจ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
