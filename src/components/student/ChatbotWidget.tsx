"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
interface Message {
  id: string;
  role: "user" | "model";
  content: string;
}

const TypewriterMarkdown = ({ content, isLast }: { content: string, isLast: boolean }) => {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 last:mb-0" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 last:mb-0" {...props} />,
        li: ({node, ...props}) => <li className="mb-1" {...props} />,
        strong: ({node, ...props}) => <strong className="font-bold text-blue-700 dark:text-blue-400" {...props} />,
        code: ({node, inline, ...props}: any) => 
          inline ? (
            <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs text-pink-600 dark:text-pink-400 font-mono" {...props} />
          ) : (
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg my-2 overflow-x-auto text-xs font-mono">
              <code {...props} />
            </div>
          )
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "model", content: "สวัสดีครับ! น้องบอทยินดีให้คำปรึกษาวิชาโปรแกรมฐานข้อมูลครับ มีอะไรให้ช่วยบอกได้เลยครับ" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (!res.ok) {
        let errorMsg = "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ";
        try {
          const data = await res.json();
          if (data.error) errorMsg = data.error;
        } catch(e) {}
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "model", content: errorMsg }]);
        setIsLoading(false);
        return;
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      setIsLoading(false); // Hide spinner as soon as stream connection is established

      const decoder = new TextDecoder();
      let currentMessage = "";
      const messageId = Date.now().toString();

      // Add initial empty message
      setMessages(prev => [...prev, { id: messageId, role: "model", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        currentMessage += decoder.decode(value, { stream: true });
        
        // Update the message incrementally
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, content: currentMessage } : msg
        ));
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "model", content: "ขออภัยครับ เกิดข้อผิดพลาดในระบบ" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="chatbot-widget">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-32 md:bottom-8 right-6 md:right-8 z-50 group flex items-center gap-4 print:hidden transition-all duration-500"
      >
        {/* Tooltip (Visible on Hover) */}
        <div className="hidden sm:flex items-center gap-2.5 px-6 py-3 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl whitespace-nowrap opacity-0 -translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-200 tracking-wide">
            แชทกับผู้ช่วย AI
          </span>
        </div>
        
        {/* Circular Button with Animations */}
        <div className="relative">
          {/* Main Button (Solid Blue) */}
          <div className="w-16 h-16 md:w-[72px] md:h-[72px] bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg relative transition-transform duration-300 group-hover:scale-110 border-[3px] border-white dark:border-slate-800">
            <Bot className="w-8 h-8 md:w-10 md:h-10 relative z-10" strokeWidth={2.5} />
            
            {/* Status Dot */}
            <span className="absolute top-0 right-0 md:top-0 md:right-0 flex h-3 w-3 md:h-4 md:w-4 z-20">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500 border-2 border-white dark:border-slate-800"></span>
            </span>
          </div>
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 md:bottom-32 right-4 md:right-8 z-[60] w-[calc(100vw-32px)] max-w-sm sm:max-w-md md:w-[400px] h-[450px] max-h-[60vh] md:max-h-[70vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shrink-0 shadow-sm z-10 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold tracking-wide">AI Assistant</h3>
                <p className="text-[10px] text-blue-100 uppercase tracking-widest opacity-90">Powered by Gemini</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
            {messages.map((msg, index) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full rounded-bl-sm bg-blue-600 dark:bg-blue-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                )}
                <div className={`max-w-[80%] p-3.5 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="text-sm leading-relaxed break-words">
                      <TypewriterMarkdown 
                        content={msg.content} 
                        isLast={index === messages.length - 1} 
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Bot className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-sm">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-xs text-slate-500 font-medium">AI กำลังประมวลผลคำตอบ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="พิมพ์คำถามของคุณที่นี่..."
                disabled={isLoading}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full py-3.5 pl-5 pr-14 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm active:scale-95"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
