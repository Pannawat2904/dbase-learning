"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function NavigationLoaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, navigation finished!
  useEffect(() => {
    setIsLoading(false);
    setProgress(100);
    const timer = setTimeout(() => setProgress(0), 300);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Global listener for link clicks
  useEffect(() => {
    let progressInterval: any;

    const handleAnchorClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");
      const download = target.getAttribute("download");

      // Ignore external, hash links, downloads, new tabs
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("blob:") ||
        href.startsWith("javascript:") ||
        targetAttr === "_blank" ||
        download !== null
      ) {
        return;
      }

      // Check if same URL
      try {
        const url = new URL(href, window.location.href);
        const current = new URL(window.location.href);
        if (
          url.origin === current.origin &&
          url.pathname === current.pathname &&
          url.search === current.search
        ) {
          return; // Same page
        }
      } catch (e) {
        // invalid URL
      }

      // Trigger Loading animation
      setIsLoading(true);
      setProgress(25);

      if (progressInterval) clearInterval(progressInterval);
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 15;
        });
      }, 150);
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      if (progressInterval) clearInterval(progressInterval);
    };
  }, []);

  // Safety fallback: if loading takes too long (e.g. 6s), hide it
  useEffect(() => {
    let timeout: any;
    if (isLoading) {
      timeout = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 6000);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <>
      {/* Top glowing gradient progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[99999] pointer-events-none overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-all duration-300 ease-out shadow-sm shadow-blue-500/50"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating Glassmorphic Spinner Pill */}
      {isLoading && (
        <div className="fixed top-5 right-5 z-[99999] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-blue-200 dark:border-blue-800/60 rounded-full shadow-xl shadow-blue-500/10">
            {/* Spinning ring */}
            <div className="relative flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
              <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin opacity-50 absolute" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              กำลังโหลด...
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default function NavigationLoader() {
  return (
    <React.Suspense fallback={null}>
      <NavigationLoaderContent />
    </React.Suspense>
  );
}
