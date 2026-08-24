"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Save, User, Palette, Loader2, KeyRound, Shield, CheckCircle } from "lucide-react";
import { getSettings, updateSettings, updateTeacherProfile } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "system">("profile");
  const [loading, setLoading] = useState(true);
  
  // Current Teacher Profile State
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherAvatar, setTeacherAvatar] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingTeacherAvatar, setUploadingTeacherAvatar] = useState(false);
  const teacherAvatarInputRef = useRef<HTMLInputElement>(null);

  // System Settings State
  const [savingSystem, setSavingSystem] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [allowedEmailDomain, setAllowedEmailDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      // 1. Fetch current logged-in teacher
      try {
        const res = await fetch("/api/admin/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && data?.teacher) {
            setTeacherId(data.teacher.id);
            setTeacherName(data.teacher.name || "");
            setTeacherUsername(data.teacher.username || "");
            setTeacherAvatar(data.teacher.avatar_url || "");
          }
        }
      } catch (e) {
        console.error("Error fetching current teacher:", e);
      }

      // 2. Fetch system settings
      const settingsData = await getSettings();
      if (settingsData) {
        setSchoolName(settingsData.school_name || "วิทยาลัยอาชีวศึกษาสุราษฎร์ธานี");
        setAdminName(settingsData.admin_name || "อ. สมบูรณ์");
        setAllowedEmailDomain(settingsData.allowed_email_domain || "");
        setLogoUrl(settingsData.logo_url || "");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSaveProfile = async () => {
    if (!teacherId || teacherId === "admin-fallback") {
      toast.error("ไม่สามารถแก้ไขโปรไฟล์ของบัญชีผู้ดูแลระบบชั่วคราวได้");
      return;
    }
    if (!teacherName.trim()) {
      toast.error("กรุณาระบุชื่อ-นามสกุล");
      return;
    }
    if (!teacherUsername.trim()) {
      toast.error("กรุณาระบุ Username");
      return;
    }

    setSavingProfile(true);
    const toastId = toast.loading("กำลังบันทึกข้อมูลโปรไฟล์...");

    const updates: { name: string; username: string; avatar_url: string; password_hash?: string } = {
      name: teacherName.trim(),
      username: teacherUsername.trim(),
      avatar_url: teacherAvatar,
    };

    if (teacherPassword.trim()) {
      updates.password_hash = teacherPassword.trim();
    }

    const res = await updateTeacherProfile(teacherId, updates);
    setSavingProfile(false);

    if (res) {
      toast.success("บันทึกข้อมูลโปรไฟล์ของคุณเรียบร้อยแล้ว", { id: toastId });
      setTeacherPassword("");
      // Refresh page or reload window to apply updated session/cookie
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } else {
      toast.error("เกิดข้อผิดพลาดในการบันทึกโปรไฟล์", { id: toastId });
    }
  };

  const handleUploadTeacherAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTeacherAvatar(true);
    const supabase = createClient();
    
    const fileExt = file.name.split(".").pop();
    const fileName = `avatar-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("public_assets")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Error uploading avatar: " + uploadError.message);
      setUploadingTeacherAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("public_assets")
      .getPublicUrl(filePath);

    setTeacherAvatar(publicUrl);
    setUploadingTeacherAvatar(false);
    toast.success("อัปโหลดรูปโปรไฟล์เรียบร้อย กดบันทึกเพื่อยืนยัน");
  };

  const handleSaveSystem = async () => {
    setSavingSystem(true);
    const toastId = toast.loading("กำลังบันทึกการตั้งค่าระบบ...");
    const success = await updateSettings({
      school_name: schoolName,
      admin_name: adminName,
      allowed_email_domain: allowedEmailDomain,
      logo_url: logoUrl,
    });
    setSavingSystem(false);
    if (success) {
      toast.success("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว", { id: toastId });
    } else {
      toast.error("เกิดข้อผิดพลาดในการบันทึก", { id: toastId });
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const supabase = createClient();
    
    const fileExt = file.name.split(".").pop();
    const fileName = `logo-${Math.random()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("public_assets")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Error uploading logo: " + uploadError.message);
      setUploadingLogo(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("public_assets")
      .getPublicUrl(filePath);

    setLogoUrl(publicUrl);
    setUploadingLogo(false);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">กำลังโหลด...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ตั้งค่า (Settings)</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">จัดการโปรไฟล์ของคุณครู และการตั้งค่าระบบสถานศึกษา</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-6 py-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "profile"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <User className="w-4 h-4" />
            โปรไฟล์ของฉัน ({teacherName || "ครูผู้สอน"})
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-6 py-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "system"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Settings className="w-4 h-4" />
            ข้อมูลสถานศึกษา & ระบบ
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* TAB 1: TEACHER PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <input
                  type="file"
                  ref={teacherAvatarInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleUploadTeacherAvatar}
                />
                <div
                  onClick={() => teacherAvatarInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-dashed border-blue-400 dark:border-blue-500 flex items-center justify-center cursor-pointer overflow-hidden group shadow-md"
                >
                  {uploadingTeacherAvatar ? (
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  ) : teacherAvatar ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={teacherAvatar} alt={teacherName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-medium backdrop-blur-sm">
                        เปลี่ยนรูป
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                      <User className="w-8 h-8" />
                      <span className="text-[10px] mt-1">อัปโหลด</span>
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 mb-1">
                    <Shield className="w-3 h-3" /> บัญชีครูผู้สอนที่กำลังใช้งาน
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{teacherName || "คุณครู"}</h3>
                  <p className="text-sm text-slate-500">Username: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{teacherUsername || "admin"}</span></p>
                </div>
              </div>

              <section className="space-y-4">
                <h4 className="text-md font-semibold text-slate-800 dark:text-white">แก้ไขข้อมูลประจำตัว</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="เช่น อาจารย์สมใจ รักเรียน"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Username (สำหรับเข้าสู่ระบบ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      placeholder="เช่น teacher_somjai"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      เปลี่ยนรหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)
                    </label>
                    <input
                      type="password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่ที่ต้องการเปลี่ยน..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </section>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || !teacherName.trim()}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  บันทึกโปรไฟล์ของฉัน
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM SETTINGS */}
          {activeTab === "system" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* General Settings */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">ข้อมูลสถานศึกษา</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อโรงเรียน / สถาบัน</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อผู้ดูแลระบบหลัก</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">จำกัดโดเมนอีเมล (คั่นด้วยลูกน้ำ หากมีหลายโดเมน)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={allowedEmailDomain}
                        onChange={(e) => setAllowedEmailDomain(e.target.value)}
                        placeholder="ตัวอย่าง: svc.ac.th, kmutnb.ac.th"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                    <p className="text-xs text-slate-500">เว้นว่างหากอนุญาตทั้งหมด หรือคั่นด้วยลูกน้ำ (,) เพื่อระบุหลายโดเมน</p>
                  </div>
                </div>
              </section>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* Theme Settings */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-500" />
                  ธีมสีและโลโก้สถาบัน
                </h3>
                <div className="flex items-center gap-6">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleUploadLogo}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-28 h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors overflow-hidden group"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    ) : logoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-medium backdrop-blur-sm">
                          เปลี่ยนโลโก้
                        </div>
                      </>
                    ) : (
                      <span className="text-sm font-medium group-hover:text-blue-500 transition-colors">อัปโหลด</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">โลโก้สถาบัน</p>
                    <p className="text-xs text-slate-500">แนะนำขนาด 256x256px พื้นหลังโปร่งใส (PNG, SVG)</p>
                    {logoUrl && (
                      <button
                        onClick={() => setLogoUrl("")}
                        className="mt-3 text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        ลบโลโก้
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSaveSystem}
                  disabled={savingSystem}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingSystem ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  บันทึกการตั้งค่าระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
