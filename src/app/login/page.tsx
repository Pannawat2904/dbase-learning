import { loginWithGoogle } from './actions'
import { ArrowLeft, ShieldCheck, Database } from 'lucide-react'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const error = (await searchParams).error

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 overflow-hidden selection:bg-blue-500/30">
      
      {/* Elegant Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Subtle Radial Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_50%)]"></div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 dark:opacity-5"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Back Link */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
        </div>

        {/* Login Card */}
        <div className="relative group">
          {/* Subtle Colored Edge / Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-400/30 via-transparent to-purple-400/30 rounded-[2rem] opacity-70 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
          
          <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-blue-100/50 dark:border-blue-900/30 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-blue-900/5 dark:shadow-none">
            
            {/* Header Section */}
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100/80 dark:border-blue-800/50 flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  เข้าสู่ระบบ DBASE AI
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  เข้าสู่ระบบเพื่อเรียนรู้และปรึกษากับ AI Tutor ส่วนตัว
                </p>
              </div>
            </div>

          <form className="space-y-6">
            {/* Google Login Button */}
            <button
              formAction={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              เข้าสู่ระบบด้วยบัญชี Google
            </button>

            {/* Secure Login Badge */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>การเชื่อมต่อปลอดภัยและเข้ารหัส</span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-sm font-medium text-red-600 dark:text-red-400 text-center animate-in zoom-in-95 duration-300">
                {error}
              </div>
            )}
          </form>

        </div>
        </div>
        
        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 px-8">
          การเข้าสู่ระบบแสดงว่าคุณยอมรับเงื่อนไขการให้บริการและนโยบายความเป็นส่วนตัวของเรา
        </p>

      </div>
    </div>
  )
}
