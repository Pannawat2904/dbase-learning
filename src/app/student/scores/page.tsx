"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function StudentScoresPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 md:px-6 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            ตรวจสอบคะแนนรายบุคคล
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            ดูผลการเรียนและคะแนนเก็บของคุณ
          </p>
        </div>
      </div>
      
      <div className="flex-1 relative bg-slate-100 dark:bg-slate-950">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดระบบตรวจสอบคะแนน...</p>
          </div>
        )}
        <iframe
          src="https://student-scores.vercel.app"
          className="w-full h-full border-none"
          title="Student Scores System"
          onLoad={() => setIsLoading(false)}
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
