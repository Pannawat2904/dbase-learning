"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function StudentScoresPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-[calc(100vh-76px)] md:h-[calc(100vh-76px)] overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-10">
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
  );
}
