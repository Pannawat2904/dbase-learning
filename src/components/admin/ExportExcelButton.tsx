"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExportExcelButtonProps {
  students: any[];
}

export default function ExportExcelButton({ students }: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      // Create CSV headers
      const headers = [
        "รหัสนักศึกษา/ชื่อ",
        "อีเมล",
        "ความก้าวหน้า (%)",
        "แบบทดสอบก่อนเรียน",
        "แบบทดสอบหลังเรียน",
        "เข้าเรียนล่าสุด"
      ];

      // Format data rows
      const rows = students.map(s => [
        `"${s.name}"`,
        `"${s.email || '-'}"`,
        `"${s.progress}"`,
        `"${s.preTest}"`,
        `"${s.postTest}"`,
        `"${s.lastActive}"`
      ]);

      // Add BOM to support UTF-8 (Thai characters) in Excel
      const BOM = "\uFEFF";
      const csvContent = BOM + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

      // Create Blob and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `รายงานคะแนนนักเรียน_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("ดาวน์โหลดรายงานข้อมูลนักเรียนเรียบร้อยแล้ว");
    } catch (e) {
      console.error("Export failed:", e);
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:opacity-50"
      style={{ backgroundColor: '#059669' }}
    >
      <Download className="w-4 h-4" />
      {isExporting ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด (Excel)"}
    </button>
  );
}
