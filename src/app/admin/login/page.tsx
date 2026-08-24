"use client";

import { useSearchParams } from "next/navigation";
import { loginTeacher } from "./actions";
import { Database, Lock, User, ArrowRight, ShieldCheck, Sparkles, ChevronLeft } from "lucide-react";
import { Suspense, useState } from "react";
import Link from "next/link";

import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="group w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
    >
      {pending ? (
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        <>
          เข้าสู่ระบบหลังบ้าน
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <form 
      action={loginTeacher}
      className="space-y-6 relative z-10 mt-6"
    >
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500">
            <Lock className="w-4 h-4" />
          </div>
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div className="group">
          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider ml-1">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600 text-slate-400">
              <User className="h-5 w-5" />
            </div>
            <input
              type="text"
              name="username"
              required
              className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-50 transition-all shadow-sm hover:border-slate-300"
              placeholder="กรอก Username ของคุณ"
            />
          </div>
        </div>

        <div className="group">
          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider ml-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600 text-slate-400">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type="password"
              name="password"
              required
              className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-50 transition-all shadow-sm hover:border-slate-300"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
        <Link href="/" className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md rounded-full border border-slate-200/50 dark:border-slate-700/50 transition-all shadow-sm hover:shadow">
          <ChevronLeft className="w-4 h-4" />
          กลับสู่หน้าหลัก
        </Link>
      </div>

      {/* Light Background Effects */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03]"></div>
      </div>
      
      <div className="px-4 sm:px-0 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        {/* Logo Icon */}
        <div className="flex justify-center mb-8 relative">
          <div className="w-20 h-20 rounded-[1.5rem] bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/20 relative z-10">
            <ShieldCheck className="w-10 h-10 text-white drop-shadow-md" />
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center justify-center gap-2">
            Teacher Portal <Sparkles className="w-6 h-6 text-blue-500" />
          </h2>
          <p className="mt-3 text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
            ระบบจัดการคอร์สเรียนอัจฉริยะ ยืนยันตัวตนเพื่อเข้าสู่ระบบหลังบ้าน
          </p>
        </div>

        {/* Clean Form Container */}
        <div className="bg-white/80 backdrop-blur-xl px-6 py-8 sm:px-12 sm:py-10 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative">
          <Suspense fallback={
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500">กำลังเตรียมหน้าเข้าสู่ระบบ...</p>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
