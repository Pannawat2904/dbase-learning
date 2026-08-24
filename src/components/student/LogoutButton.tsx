"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <button 
      onClick={handleLogout}
      className="md:hidden flex items-center justify-center gap-2 w-full mt-8 px-6 py-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors border border-red-100 dark:border-red-900/30"
    >
      <LogOut className="w-5 h-5" />
      ออกจากระบบ
    </button>
  );
}
