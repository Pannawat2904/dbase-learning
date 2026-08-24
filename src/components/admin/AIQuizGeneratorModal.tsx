"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, PlusCircle } from "lucide-react";

interface AIQuizGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsGenerated: (questions: any[]) => void;
}

export default function AIQuizGeneratorModal({ isOpen, onClose, onQuestionsGenerated }: AIQuizGeneratorModalProps) {
  const [promptText, setPromptText] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      setError("กรุณาใส่เนื้อหาจากบทเรียนที่ต้องการให้ AI สร้างข้อสอบ");
      return;
    }

    setIsGenerating(true);
    setError("");
    setGeneratedQuestions([]);

    try {
      const response = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: promptText, numQuestions })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate questions");
      }

      setGeneratedQuestions(data.questions);
    } catch (err: any) {
      console.error("AI Error:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAll = () => {
    if (generatedQuestions.length > 0) {
      onQuestionsGenerated(generatedQuestions);
      onClose();
      setGeneratedQuestions([]);
      setPromptText("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">
                AI ผู้ช่วยสร้างข้อสอบ
              </h3>
              <p className="text-xs text-slate-500 font-medium">วางเนื้อหาจากสไลด์ แล้วให้ AI ช่วยคิดโจทย์และช้อยส์</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            aria-label="ปิดหน้าต่างสร้างข้อสอบด้วย AI"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm">
              {error}
            </div>
          )}

          {generatedQuestions.length === 0 ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">เนื้อหาบทเรียน (Source Text)</label>
                <textarea 
                  rows={8}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="เช่น: ฐานข้อมูลเชิงสัมพันธ์คือฐานข้อมูลที่จัดเก็บข้อมูลในรูปแบบตาราง..."
                  className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                ></textarea>
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">จำนวนข้อที่ต้องการสร้าง:</label>
                <select 
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value={1}>1 ข้อ</option>
                  <option value={3}>3 ข้อ</option>
                  <option value={5}>5 ข้อ</option>
                  <option value={10}>10 ข้อ</option>
                </select>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !promptText.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isGenerating ? 'AI กำลังวิเคราะห์และแต่งโจทย์...' : 'สร้างข้อสอบทันที'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 dark:text-white text-lg">ตัวอย่างข้อสอบที่ AI สร้างให้ ({generatedQuestions.length} ข้อ)</h4>
              
              {generatedQuestions.map((q, i) => (
                <div key={i} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-3">
                    <span className="text-blue-600 font-bold mr-2">ข้อ {i + 1}.</span> 
                    <span dangerouslySetInnerHTML={{ __html: q.text }} />
                  </p>
                  <div className="space-y-2 ml-6">
                    {q.options.map((opt: string, optIdx: number) => (
                      <div key={optIdx} className={`px-3 py-2 text-sm rounded-lg border ${q.correctOptionIndex === optIdx ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400 font-medium' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                        {String.fromCharCode(65 + optIdx)}. {opt}
                        {q.correctOptionIndex === optIdx && <span className="ml-2 text-xs">(เฉลย)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                <button 
                  onClick={() => setGeneratedQuestions([])}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                >
                  ยกเลิก / สร้างใหม่
                </button>
                <button 
                  onClick={handleAcceptAll}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex justify-center items-center gap-2 transition-colors shadow-sm"
                >
                  <PlusCircle className="w-5 h-5" />
                  เพิ่ม {generatedQuestions.length} ข้อลงในบทเรียน
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
