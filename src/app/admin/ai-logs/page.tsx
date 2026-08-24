"use client";

import { useState, useEffect } from "react";
import { Bot, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AILogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Fetch initial logs
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('ai_chat_logs')
        .select(`
          *,
          profiles:student_id (full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLogs(data);
      }
    };
    fetchLogs();

    // Subscribe to real-time inserts
    const channel = supabase.channel('realtime:ai_chat_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_chat_logs' }, async (payload) => {
        const newLogRaw = payload.new;
        // Fetch the student's profile for the newly inserted log
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', newLogRaw.student_id)
          .single();
          
        const newLog = { ...newLogRaw, profiles: profile };
        setLogs(prev => [newLog, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg" />
            ประวัติการคุยกับ AI
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              อัปเดตเรียลไทม์
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">ดูประวัติคำถามที่นักเรียนถาม AI เพื่อนำไปวิเคราะห์ประเด็นที่นักเรียนสงสัยมากที่สุด</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">คำถามทั้งหมด</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{logs.length}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">คำถามวันนี้</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
              {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
            </h3>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4 w-1/4">นักเรียน</th>
                <th className="px-6 py-4 w-1/3">คำถาม</th>
                <th className="px-6 py-4 w-1/3">คำตอบของ AI</th>
                <th className="px-6 py-4 w-32">เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 relative">
              {logs.length > 0 ? logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                        {log.profiles?.avatar_url ? (
                          <img src={log.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-100">
                            {(log.profiles?.full_name || 'U').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                        {log.profiles?.full_name || 'ไม่ทราบชื่อ'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl rounded-tl-sm text-sm text-slate-700 dark:text-slate-300">
                      {log.question}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl rounded-tl-sm text-sm text-slate-600 dark:text-slate-400 line-clamp-3 hover:line-clamp-none cursor-pointer transition-all">
                      {log.answer}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Bot className="w-12 h-12 mx-auto text-slate-300 mb-3 opacity-50" />
                    <p>ยังไม่มีประวัติการคุยกับ AI</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
