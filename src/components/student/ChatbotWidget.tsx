"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, RotateCcw, Copy, Check, Terminal } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp?: string;
}

const TypewriterMarkdown = ({ content }: { content: string }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed text-sm" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2.5 space-y-1 text-sm text-slate-700 dark:text-slate-300" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-sm text-slate-700 dark:text-slate-300" {...props} />,
        li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
        strong: ({node, ...props}) => <strong className="font-bold text-blue-600 dark:text-blue-400" {...props} />,
        code: ({node, inline, children, ...props}: any) => {
          const codeString = String(children).replace(/\n$/, '');
          if (inline) {
            return (
              <code className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md text-xs font-mono border border-blue-200/50 dark:border-blue-800/50 font-semibold" {...props}>
                {children}
              </code>
            );
          }
          return (
            <div className="relative my-2.5 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-md">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 text-slate-300 text-[11px] font-mono border-b border-slate-700/60">
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <Terminal className="w-3.5 h-3.5" /> SQL / Code
                </span>
                <button
                  onClick={() => handleCopy(codeString)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-[10px] bg-slate-700/50 px-2 py-0.5 rounded hover:bg-slate-700"
                >
                  {copiedCode === codeString ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>คัดลอก</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed bg-slate-950/70">
                <code>{children}</code>
              </pre>
            </div>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "init", 
      role: "model", 
      content: "สวัสดีครับ! ผมชื่อ **น้องบอท** (By KruBall) ผู้ช่วยสอนวิชาโปรแกรมฐานข้อมูล ยินดีตอบข้อสงสัย แนะนำคำสั่ง SQL และเทคนิคการเรียนให้ครับ มีอะไรให้ช่วยสอบถามได้เลยครับ! 🤖✨",
      timestamp: "ตอนนี้"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: queryText, timestamp: timeStr };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText }),
      });

      if (!res.ok) {
        let errorMsg = "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ AI";
        try {
          const data = await res.json();
          if (data.error) errorMsg = data.error;
        } catch(e) {}
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "model", content: errorMsg, timestamp: timeStr }]);
        setIsLoading(false);
        return;
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      setIsLoading(false);

      const decoder = new TextDecoder();
      let currentMessage = "";
      const messageId = Date.now().toString();

      setMessages(prev => [...prev, { id: messageId, role: "model", content: "", timestamp: timeStr }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        currentMessage += decoder.decode(value, { stream: true });
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, content: currentMessage } : msg
        ));
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "model", content: "ขออภัยครับ เกิดข้อผิดพลาดในการรับข้อมูลจาก AI", timestamp: timeStr }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  const handleResetChat = () => {
    setMessages([
      { 
        id: "init", 
        role: "model", 
        content: "สวัสดีครับ! ผมชื่อ **น้องบอท** (By KruBall) ผู้ช่วยสอนวิชาโปรแกรมฐานข้อมูล ยินดีตอบข้อสงสัย แนะนำคำสั่ง SQL และเทคนิคการเรียนให้ครับ มีอะไรให้ช่วยสอบถามได้เลยครับ! 🤖✨",
        timestamp: "ตอนนี้"
      }
    ]);
  };

  return (
    <div id="chatbot-widget">
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="เปิดหน้าต่างพูดคุยกับ น้องบอท (By KruBall)"
        className="fixed bottom-28 md:bottom-8 right-5 md:right-8 z-50 group flex items-center gap-3 print:hidden transition-all duration-300 cursor-pointer"
      >
        {/* Tooltip on Hover */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl opacity-0 -translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
          <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200">
            ถามผู้ช่วยอัจฉริยะ
          </span>
        </div>
        
        {/* Circular Avatar Trigger */}
        <div className="relative">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/25 relative transition-all duration-300 group-hover:scale-110 group-hover:shadow-blue-500/40 border-[3px] border-white dark:border-slate-800">
            <Bot className="w-7 h-7 md:w-8 md:h-8 relative z-10 drop-shadow-md" strokeWidth={2.2} />
            
            {/* Status Beacon */}
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5 z-20">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800"></span>
            </span>
          </div>
        </div>
      </button>

      {/* Modern Glassmorphic Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 md:bottom-28 right-4 md:right-8 z-[70] w-[calc(100vw-32px)] max-w-sm sm:max-w-md md:w-[420px] h-[520px] max-h-[75vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-blue-200/60 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 zoom-in-95 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 flex items-center justify-between text-white shrink-0 shadow-md relative overflow-hidden">
            {/* Background ambient lighting */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-3 relative z-10">
              {/* Bot Avatar Icon */}
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                <Bot className="w-6 h-6 text-white drop-shadow" strokeWidth={2.3} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base tracking-wide text-white">น้องบอท</h3>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-blue-50 border border-white/25">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" /> By KruBall
                  </span>
                </div>
                <p className="text-[11px] text-blue-100 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span>ผู้ช่วยสอนวิชาโปรแกรมฐานข้อมูล</span>
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1 relative z-10">
              <button
                onClick={handleResetChat}
                title="ล้างข้อความแชท"
                aria-label="ล้างข้อความแชท"
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-blue-100 hover:text-white cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                title="ปิดหน้าต่างแชท"
                aria-label="ปิดหน้าต่าง น้องบอท"
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-blue-100 hover:text-white cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/70">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1 text-white border border-white/20">
                    <Bot className="w-4 h-4" strokeWidth={2.2} />
                  </div>
                )}
                
                <div className={`max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-xs p-3.5 shadow-md shadow-blue-500/15' 
                    : 'bg-white dark:bg-slate-800/95 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl rounded-tl-xs p-4 shadow-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="text-sm leading-relaxed break-words">
                      <TypewriterMarkdown content={msg.content} />
                    </div>
                  )}
                  {msg.timestamp && (
                    <div className={`text-[10px] mt-1.5 text-right ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing / Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1 text-white">
                  <Bot className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">น้องบอท กำลังคิดคำตอบ...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Input Area */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
              <input 
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ถามข้อสงสัยเกี่ยวกับวิชาฐานข้อมูล..."
                aria-label="พิมพ์คำถามของคุณถึง น้องบอท"
                disabled={isLoading}
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl py-3 pl-4 pr-12 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="ส่งคำถาม"
                className="absolute right-1.5 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1.5">
              น้องบอทอาจให้คำตอบที่คลาดเคลื่อนได้ ควรตรวจสอบเนื้อหาในบทเรียนประกอบ
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
