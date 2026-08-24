import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Loading Spinner Indicator */}
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner label="กำลังโหลดข้อมูลแดชบอร์ด..." size="md" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800"></div>
              <div className="w-16 h-6 rounded-full bg-slate-100 dark:bg-slate-800"></div>
            </div>
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800"></div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-slate-50 dark:bg-slate-800/40 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
