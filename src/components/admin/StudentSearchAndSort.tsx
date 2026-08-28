"use client";

import { Search, ArrowUpDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

export default function StudentSearchAndSort({ defaultQuery = "", defaultSort = "id_asc" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultQuery);
  const [sort, setSort] = useState(defaultSort);
  const [isPending, startTransition] = useTransition();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrl(query, sort);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const updateUrl = (q: string, s: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    
    params.set("sort", s);
    
    startTransition(() => {
      router.push(`?${params.toString()}`);
      router.refresh();
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    setSort(newSort);
    updateUrl(query, newSort);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={`h-5 w-5 ${isPending ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
          placeholder="ค้นหาชื่อ, รหัส หรืออีเมลนักเรียน..."
        />
      </div>
      <div className="relative min-w-[200px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
        </div>
        <select
          value={sort}
          onChange={handleSortChange}
          className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-700 dark:text-slate-300 appearance-none cursor-pointer transition-colors"
        >
          <option value="id_asc">รหัสนักศึกษา (น้อยไปมาก)</option>
          <option value="id_desc">รหัสนักศึกษา (มากไปน้อย)</option>
          <option value="name_asc">ชื่อ (ก-ฮ, A-Z)</option>
          <option value="name_desc">ชื่อ (ฮ-ก, Z-A)</option>
          <option value="progress_desc">ความก้าวหน้า (มากไปน้อย)</option>
          <option value="progress_asc">ความก้าวหน้า (น้อยไปมาก)</option>
        </select>
      </div>
    </div>
  );
}
