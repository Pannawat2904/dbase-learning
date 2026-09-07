"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createLMSWorkbook,
  addHeaderBanner,
  addKpiCards,
  formatStyledTable,
  downloadWorkbook,
  ColumnDefinition,
} from "@/utils/excel-styler";

interface ExportExcelButtonProps {
  students: any[];
  courseTitle?: string;
}

export default function ExportExcelButton({ students = [], courseTitle }: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!students || students.length === 0) {
      toast.warning("ไม่มีข้อมูลนักเรียนสำหรับส่งออก");
      return;
    }

    setIsExporting(true);
    try {
      const wb = createLMSWorkbook("รายงานข้อมูลและผลการเรียนรู้ของนักศึกษา");
      const ws = wb.addWorksheet("ข้อมูลและคะแนนนักเรียน", {
        views: [{ showGridLines: true }],
      });

      // 1. Title Banner
      const nextRow = addHeaderBanner(ws, {
        title: "รายงานข้อมูลและผลคะแนนการเรียนรู้ของนักศึกษา (Student Performance Report)",
        subtitle: courseTitle ? `รายวิชา: ${courseTitle}` : "ระบบการจัดการเรียนการสอนและประเมินผลออนไลน์ (LMS)",
        infoList: [`จำนวนนักศึกษาทั้งหมด: ${students.length} คน`],
        totalCols: 13,
        theme: "navy",
      });

      // 2. Compute KPI Metrics
      const totalStudents = students.length;
      const avgProgress = totalStudents > 0
        ? (students.reduce((acc, s) => acc + (Number(s.progress) || 0), 0) / totalStudents).toFixed(1)
        : "0.0";
      
      const completedCount = students.filter(s => s.status === "Completed" || (s.progress >= 100)).length;
      const activeCount = students.filter(s => s.status === "Active" || s.statusLabel === "กำลังเรียน").length;
      const certificateCount = students.filter(s => s.hasCertificate).length;

      // 3. KPI Summary Cards
      const tableStartRow = addKpiCards(
        ws,
        [
          { label: "👥 นักศึกษาทั้งหมด", value: `${totalStudents} คน`, sublabel: "ลงทะเบียนในระบบ", colorType: "blue" },
          { label: "📈 ความก้าวหน้าเฉลี่ย", value: `${avgProgress}%`, sublabel: "ภาพรวมทั้งห้อง", colorType: "emerald" },
          { label: "🏆 เรียนจบหลักสูตร", value: `${completedCount} คน`, sublabel: "ผ่านเกณฑ์การเรียน", colorType: "purple" },
          { label: "🟢 กำลังเรียน (Active)", value: `${activeCount} คน`, sublabel: "เข้าเรียนสม่ำเสมอ", colorType: "blue" },
          { label: "🎓 ได้รับประกาศนียบัตร", value: `${certificateCount} คน`, sublabel: "ออกใบรับรองแล้ว", colorType: "emerald" },
        ],
        nextRow
      );

      // 4. Define Table Columns
      const columns: ColumnDefinition[] = [
        { header: "ลำดับ", width: 8, align: "center" },
        { header: "รหัสนักศึกษา", width: 16, align: "center" },
        { header: "ชื่อ - นามสกุล", width: 28, align: "left" },
        { header: "อีเมล", width: 28, align: "left" },
        { header: "ความก้าวหน้า", width: 15, align: "center" },
        { header: "คะแนนก่อนเรียน\n(Pre-test)", width: 16, align: "center", wrapText: true },
        { header: "คะแนนหลังเรียน\n(Post-test)", width: 16, align: "center", wrapText: true },
        { header: "พัฒนาการ\n(Gain Score)", width: 15, align: "center", wrapText: true },
        { header: "แบบทดสอบย่อย\n(Quizzes)", width: 15, align: "center", wrapText: true },
        { header: "คะแนนใบงาน\n(Assignments)", width: 15, align: "center", wrapText: true },
        { header: "สถานะผู้เรียน", width: 16, align: "center" },
        { header: "ใบประกาศนียบัตร", width: 16, align: "center" },
        { header: "เข้าเรียนล่าสุด", width: 22, align: "center" },
      ];

      // 5. Build Table Data Rows
      const rows = students.map((s, idx) => {
        // Calculate Gain Score if both pre and post test have scores
        let gainScoreText = "-";
        const parseScore = (str: string) => {
          if (!str || str === "-") return null;
          const parts = str.split("/");
          const score = parseFloat(parts[0]);
          return isNaN(score) ? null : score;
        };

        const preNum = parseScore(s.preTest);
        const postNum = parseScore(s.postTest);
        if (preNum !== null && postNum !== null) {
          const diff = postNum - preNum;
          gainScoreText = diff >= 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
        }

        return [
          idx + 1,
          s.studentIdNum || "-",
          s.name || "ไม่ระบุชื่อ",
          s.email || "-",
          `${s.progress || 0}%`,
          s.preTest || "-",
          s.postTest || "-",
          gainScoreText,
          s.quiz || "-",
          s.assignment || "-",
          s.statusLabel || "ยังไม่เริ่มเรียน",
          s.hasCertificate ? "มีประกาศนียบัตร" : "-",
          s.lastActive || "ยังไม่เคยเข้าเรียน",
        ];
      });

      // 6. Format and Render Table
      formatStyledTable(ws, {
        startRow: tableStartRow,
        columns,
        data: rows,
        statusColumnIndex: 10, // Column 10 is "สถานะผู้เรียน"
        freezeHeader: true,
      });

      // 7. Save and Download
      const safeCourse = courseTitle ? `_${courseTitle.slice(0, 20).replace(/[\\/:*?"<>|]/g, "_")}` : "";
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `รายงานผลคะแนนนักศึกษา${safeCourse}_${dateStr}.xlsx`;

      await downloadWorkbook(wb, fileName);
      toast.success("ส่งออกไฟล์ Excel สำเร็จ เรียบร้อยและสวยงาม");
    } catch (e) {
      console.error("Export failed:", e);
      toast.error("เกิดข้อผิดพลาดในการสร้างไฟล์ Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:opacity-95 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      style={{ backgroundColor: '#059669' }}
      title="ส่งออกรายงานข้อมูลและผลคะแนนนักศึกษาเป็นไฟล์ Excel"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {isExporting ? "กำลังสร้าง Excel..." : "ดาวน์โหลด (Excel)"}
    </button>
  );
}
