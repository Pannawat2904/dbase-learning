"use client";

import { useState, useEffect } from "react";
import { Megaphone, Send, Clock, Trash2, Edit2, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { confirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchAnnouncements = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      if (data) setAnnouncements(data);
    } catch (error) {
      console.warn("Announcements table might not exist yet", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      const { error: insertError } = await supabase.from("announcements").insert({
        title: title.trim(),
        content: content.trim(),
        created_by: user.id
      });

      if (insertError) throw insertError;

      setTitle("");
      setContent("");
      toast.success("ส่งประกาศให้นักเรียนเรียบร้อยแล้ว");
      fetchAnnouncements();
    } catch (e: any) {
      console.error("Error posting announcement:", e);
      setError(e.message || "เกิดข้อผิดพลาดในการประกาศ");
      toast.error(e.message || "เกิดข้อผิดพลาดในการประกาศ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog({
      title: "ยืนยันการลบประกาศ",
      message: "คุณต้องการลบประกาศนี้ใช่หรือไม่?",
      type: "danger",
      confirmText: "ลบประกาศ"
    });
    if (!confirmed) return;
    
    try {
      const supabase = createClient();
      await supabase.from("announcements").delete().eq("id", id);
      toast.success("ลบประกาศเรียบร้อยแล้ว");
      fetchAnnouncements();
    } catch (e: any) {
      console.error("Error deleting announcement:", e);
      toast.error("เกิดข้อผิดพลาดในการลบประกาศ");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full overflow-hidden flex flex-col min-h-[500px] md:h-[500px]">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-500" />
            จัดการประกาศ
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            แจ้งข่าวสารไปยังนักเรียนทุกคน (ประกาศจะแสดงบน Dashboard ของนักเรียน)
          </p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        {/* Form Section */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">หัวข้อประกาศ</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น: แจ้งวันหยุดพิเศษ, เลื่อนวันส่งงาน"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">เนื้อหา</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="รายละเอียดประกาศ..."
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                required
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'กำลังส่งประกาศ...' : 'ส่งประกาศให้นักเรียน'}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Announcements List */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 p-6 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> ประกาศล่าสุด
          </h3>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-10">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">ยังไม่มีประกาศ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm relative group">
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDelete(announcement.id)}
                      aria-label={`ลบประกาศหัวข้อ ${announcement.title}`}
                      className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-md hover:bg-red-100"
                      title="ลบประกาศ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm pr-8">{announcement.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-2">{formatDate(announcement.created_at)}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{announcement.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
