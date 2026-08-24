"use client";

import { useState, useRef } from "react";
import { Plus, X, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAdminUser } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/client";

export default function AddTeacherButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const supabase = createClient();
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public_assets')
      .upload(filePath, file);

    if (uploadError) {
      alert('Error uploading avatar: ' + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('public_assets')
      .getPublicUrl(filePath);

    setAvatarUrl(publicUrl);
    setUploadingAvatar(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const result = await createAdminUser(name, username, password, avatarUrl);
    
    setIsSubmitting(false);
    if (result) {
      setIsOpen(false);
      setAvatarUrl("");
      router.refresh();
    } else {
      alert("เกิดข้อผิดพลาดในการสร้างบัญชี");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        เพิ่มบัญชีครู
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">เพิ่มบัญชีครูผู้สอน</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="flex flex-col items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleUploadAvatar}
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors overflow-hidden group"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  ) : avatarUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-medium backdrop-blur-sm">
                        เปลี่ยนรูป
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-xs">
                      <Upload className="w-5 h-5 mb-1 group-hover:text-blue-500 transition-colors" />
                      <span>อัปโหลด</span>
                    </div>
                  )}
                </div>
                {avatarUrl && (
                  <button 
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    ลบรูปภาพ
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ชื่อ - นามสกุล (สำหรับแสดงผล)</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  placeholder="เช่น ครูสมศรี รักเรียน"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Username (ใช้ตอนล็อกอิน)</label>
                <input 
                  type="text" 
                  name="username"
                  required
                  placeholder="เช่น kru_somsri"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">รหัสผ่าน</label>
                <input 
                  type="text" 
                  name="password"
                  required
                  placeholder="กำหนดรหัสผ่าน"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || uploadingAvatar}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'สร้างบัญชี'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
