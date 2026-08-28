import { getExamViolations } from "@/utils/exam-integrity-server";
import { ShieldAlert, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

export default async function LiveCheatingAlerts() {
  // Fetch the latest 5 violations
  const recentViolations = await getExamViolations(5);
  
  // Filter for today's violations to show active alerts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysViolations = recentViolations.filter(v => 
    new Date(v.detectedAt) >= today
  );

  if (recentViolations.length === 0) {
    return null; // Don't show anything if no cheating data exists at all
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full relative">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500"></div>
      
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              แจ้งเตือนการทุจริตแบบ Real-time
              {todaysViolations.length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">รายการทุจริตระหว่างสอบล่าสุด</p>
          </div>
        </div>
        <Link 
          href="/admin/exam-integrity"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          ดูทั้งหมด <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="p-0 flex-1 overflow-y-auto max-h-[350px]">
        {todaysViolations.length > 0 ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {recentViolations.map((v) => (
              <div key={v.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {v.studentAvatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={v.studentAvatar} alt={v.studentName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-slate-400">
                          {v.studentName?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800 dark:text-white leading-tight">
                        {v.studentName}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">
                        {v.lessonTitle}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        {v.violationLabel}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" /> 
                      {formatDistanceToNow(new Date(v.detectedAt), { addSuffix: true, locale: th })}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 border border-slate-200 dark:border-slate-700 px-1.5 rounded-sm inline-block">
                      ครั้งที่ {v.attemptNumber}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              ไม่มีการทุจริตในวันนี้
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ยังไม่พบพฤติกรรมต้องสงสัยในการสอบวันนี้
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
