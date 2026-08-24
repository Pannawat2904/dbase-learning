import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  label = "กำลังโหลดข้อมูล...",
  size = "md",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
    xl: "w-16 h-16 border-4",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center animate-in fade-in duration-300">
      {/* Animated glowing spinner */}
      <div className="relative flex items-center justify-center">
        {/* Outer glowing blur ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/30 to-indigo-500/30 blur-md animate-pulse"></div>
        
        {/* Dual spinning ring */}
        <div
          className={`${sizeClasses[size]} rounded-full border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 animate-spin`}
          style={{ animationDuration: "0.8s" }}
        ></div>
        
        <div className="absolute">
          <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin opacity-40" />
        </div>
      </div>

      {label && (
        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-wide animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-sm">
        <div className="bg-white/90 dark:bg-slate-900/90 border border-white/40 dark:border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[300px] flex items-center justify-center">
      {content}
    </div>
  );
}
