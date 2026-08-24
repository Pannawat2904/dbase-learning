"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send, User, Clock, ThumbsUp, Reply } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Discussion {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
    role: string;
  };
  replies?: Discussion[];
}

interface LessonDiscussionProps {
  courseId: string;
  lessonId: string;
  studentId: string;
}

export default function LessonDiscussion({ courseId, lessonId, studentId }: LessonDiscussionProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDiscussions = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("discussions")
        .select(`
          *,
          profiles:user_id(full_name, avatar_url, role)
        `)
        .eq("course_id", parseInt(courseId))
        .eq("lesson_id", parseInt(lessonId))
        .order("created_at", { ascending: true });

      if (error) {
        // Fallback or silent fail if table doesn't exist yet
        console.warn("Discussions table might not exist yet", error);
        setLoading(false);
        return;
      }

      if (data) {
        // Organize into threads (parents and replies)
        const threads: Discussion[] = [];
        const replyMap = new Map<string, Discussion[]>();

        data.forEach((item: any) => {
          if (item.parent_id) {
            const replies = replyMap.get(item.parent_id) || [];
            replies.push(item);
            replyMap.set(item.parent_id, replies);
          } else {
            threads.push(item);
          }
        });

        threads.forEach(thread => {
          thread.replies = replyMap.get(thread.id) || [];
        });

        setDiscussions(threads);
      }
    } catch (error) {
      console.error("Error fetching discussions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussions();
    
    // Subscribe to real-time changes
    const supabase = createClient();
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussions',
          filter: `lesson_id=eq.${lessonId}`,
        },
        () => {
          fetchDiscussions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId]);

  const handleSubmit = async (parentId: string | null = null) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("discussions").insert({
        course_id: parseInt(courseId),
        lesson_id: parseInt(lessonId),
        user_id: studentId,
        content: content.trim(),
        parent_id: parentId
      });

      if (error) {
        console.error("Error posting discussion:", error);
        alert("ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง");
      } else {
        if (parentId) {
          setReplyingTo(null);
          setReplyContent("");
        } else {
          setNewComment("");
        }
        await fetchDiscussions();
      }
    } catch (error) {
      console.error("Error submitting discussion:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full mt-8"></div>;
  }

  return (
    <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">กระดานถาม-ตอบ (Q&A)</h2>
          <p className="text-sm text-slate-500">สอบถามข้อสงสัย หรือแลกเปลี่ยนความคิดเห็นกับเพื่อนๆ</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="flex gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
          <User className="w-5 h-5 text-slate-500" />
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="พิมพ์คำถามหรือข้อสงสัยของคุณที่นี่..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[100px] transition-all"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => handleSubmit(null)}
              disabled={isSubmitting || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Send className="w-4 h-4" />
              ส่งข้อความ
            </button>
          </div>
        </div>
      </div>

      {/* Discussion Threads */}
      <div className="space-y-6">
        {discussions.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">ยังไม่มีคำถามในบทเรียนนี้</p>
            <p className="text-sm text-slate-400">เป็นคนแรกที่เริ่มการพูดคุยเลย!</p>
          </div>
        ) : (
          discussions.map((thread) => (
            <div key={thread.id} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                {thread.profiles?.avatar_url ? (
                  <img src={thread.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 rounded-tl-none">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                      {thread.profiles?.full_name || 'ผู้ใช้งาน'}
                      {thread.profiles?.role === 'admin' && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded text-[10px] uppercase">Teacher</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(thread.created_at)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {thread.content}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 mt-2 ml-2">
                  <button 
                    onClick={() => setReplyingTo(replyingTo === thread.id ? null : thread.id)}
                    className="text-xs font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                  >
                    <Reply className="w-3 h-3" />
                    ตอบกลับ
                  </button>
                </div>

                {/* Reply Input Form */}
                {replyingTo === thread.id && (
                  <div className="mt-4 flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="พิมพ์การตอบกลับของคุณ..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSubmit(thread.id);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleSubmit(thread.id)}
                      disabled={isSubmitting || !replyContent.trim()}
                      className="bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      ส่ง
                    </button>
                  </div>
                )}

                {/* Replies List */}
                {thread.replies && thread.replies.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {thread.replies.map(reply => (
                      <div key={reply.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                          {reply.profiles?.avatar_url ? (
                            <img src={reply.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3 rounded-tl-none border border-slate-200 dark:border-slate-700/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                                {reply.profiles?.full_name || 'ผู้ใช้งาน'}
                                {reply.profiles?.role === 'admin' && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded text-[10px] uppercase">Teacher</span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDate(reply.created_at)}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
