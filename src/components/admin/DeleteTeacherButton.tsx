"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteAdminUser } from "@/utils/supabase/queries";

export default function DeleteTeacherButton({ id, name }: { id: string, name: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAdminUser(id);
    setIsDeleting(false);
    
    if (result) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert("เกิดข้อผิดพลาดในการลบบัญชี");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        title="ลบบัญชี"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm text-left">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold">ยืนยันการลบบัญชี</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5">
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี <strong>{name}</strong>? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
              
              <div className="pt-5 flex gap-3">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-70"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยันการลบ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
