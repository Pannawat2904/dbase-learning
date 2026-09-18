
"use client";

import { Download, Loader2, FileSpreadsheet } from "lucide-react";
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

interface ExportResearchReportButtonProps {
  allCoursesData: { courseTitle: string; students: any[] }[];
}

export default function ExportResearchReportButton({ allCoursesData = [] }: ExportResearchReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!allCoursesData || allCoursesData.length === 0) {
      toast.warning("ไม่มีข้อมูลนักเรียนสำหรับส่งออก");
      return;
    }

    setIsExporting(true);
    try {
      // 1. Fetch survey analytics
      const res = await fetch('/api/survey?mode=analytics');
      if (!res.ok) throw new Error("Failed to fetch survey analytics");
      const surveyData = await res.json();
      const submissions = surveyData.respondentsList || [];
      const config = surveyData.config || surveyData;

      const wb = createLMSWorkbook("สรุปค่างานวิจัยในชั้นเรียน");

      // ============================================================================
      // SHEET 1-N: คะแนนนักศึกษาแต่ละรายวิชา
      // ============================================================================
      let globalScoreDataStart = 0;
      let globalScoreDataEnd = 0;
      let firstScoreSheetName = "";
      
      const allStudentsInAllCourses = allCoursesData.flatMap(c => c.students);

      allCoursesData.forEach((course, courseIdx) => {
        const students = course.students;
        const safeCourseTitle = course.courseTitle || `บทที่ ${courseIdx + 1}`;
        
        const wsScores = wb.addWorksheet(`คะแนน ${safeCourseTitle.slice(0,20)}`, { views: [{ showGridLines: true }] });
        if (courseIdx === 0) firstScoreSheetName = `'คะแนน ${safeCourseTitle.slice(0,20)}'`;
        
        const nextRow = addHeaderBanner(wsScores, {
          title: "สรุปผลสัมฤทธิ์ทางการเรียน (Student Scores)",
          subtitle: `รายวิชา: ${safeCourseTitle}`,
          infoList: [`จำนวนนักศึกษา: ${students.length} คน`],
          totalCols: 10,
          theme: "navy",
        });

        const getFullScoreText = (key: string) => {
          const st = students.find((s: any) => s[key] && s[key] !== "-");
          if (!st) return "";
          const parts = st[key].split("/");
          return parts.length > 1 ? `\n(เต็ม ${parts[1]})` : "";
        };
        
        const preMax = getFullScoreText("preTest");
        const postMax = getFullScoreText("postTest");
        const quizMax = getFullScoreText("quiz");
        const assignMax = getFullScoreText("assignment");

        const scoreColumns: ColumnDefinition[] = [
          { header: "ลำดับ", width: 8, align: "center" },
          { header: "รหัสนักศึกษา", width: 16, align: "center" },
          { header: "ชื่อ - นามสกุล", width: 28, align: "left" },
          { header: "ความก้าวหน้า", width: 15, align: "center", isPercent: true },
          { header: `คะแนนก่อนเรียน\n(Pre-test)${preMax}`, width: 18, align: "center", wrapText: true, isNumber: true },
          { header: `คะแนนหลังเรียน\n(Post-test)${postMax}`, width: 18, align: "center", wrapText: true, isNumber: true },
          { header: "พัฒนาการ\n(Gain Score)", width: 15, align: "center", wrapText: true, numFmt: "+0.0;-0.0;0" },
          { header: `แบบทดสอบย่อย\n(Quizzes)${quizMax}`, width: 18, align: "center", wrapText: true, isNumber: true },
          { header: `คะแนนใบงาน\n(Assignments)${assignMax}`, width: 18, align: "center", wrapText: true, isNumber: true },
          { header: "สถานะผู้เรียน", width: 16, align: "center" },
        ];

        const dataStartRow = nextRow + 1;
        const parseScore = (str: string) => {
          if (!str || str === "-") return "-";
          const parts = str.split("/");
          const score = parseFloat(parts[0]);
          return isNaN(score) ? "-" : score;
        };
        
        const scoreRows = students.map((s: any, idx: number) => {
          const rowNum = dataStartRow + idx;
          return [
            idx + 1,
            s.studentIdNum || "-",
            s.name || "ไม่ระบุชื่อ",
            (Number(s.progress) || 0) / 100,
            parseScore(s.preTest),
            parseScore(s.postTest),
            { formula: `IFERROR(F${rowNum}-E${rowNum}, "-")` },
            parseScore(s.quiz),
            parseScore(s.assignment),
            s.statusLabel || "ยังไม่เริ่มเรียน",
          ];
        });

        formatStyledTable(wsScores, {
          startRow: nextRow,
          columns: scoreColumns,
          data: scoreRows,
          statusColumnIndex: 9,
          freezeHeader: true,
        });

        if (courseIdx === 0) {
          globalScoreDataStart = dataStartRow;
          globalScoreDataEnd = dataStartRow + Math.max(0, students.length - 1);
        }
      });
      
      const safeCourseTitle = "รวม";

      // ============================================================================
      // SHEET 2: แบบประเมินความพึงพอใจ (Raw Survey Data)
      // ============================================================================
      const wsSurvey = wb.addWorksheet("แบบประเมินความพึงพอใจ", { views: [{ showGridLines: true }], properties: { tabColor: { argb: "FF059669" } } });
      let nextRow = addHeaderBanner(wsSurvey, {
        title: "ข้อมูลดิบแบบประเมินความพึงพอใจ",
        subtitle: `รายวิชา: ${safeCourseTitle}`,
        infoList: [`จำนวนผู้ตอบ: ${submissions.length} คน`],
        totalCols: 10,
        theme: "emerald",
      });

      const surveyDims = config.dimensions || [];
      const surveyCols: ColumnDefinition[] = [
        { header: "ลำดับ", width: 8, align: "center" },
        { header: "รหัสนักศึกษา", width: 16, align: "center" },
        { header: "ชื่อ - นามสกุล", width: 28, align: "left" },
      ];
      
      let colIdx = 4;
      const questionCols: { [key: string]: string } = {}; // qId -> Excel Column Letter (e.g. 'D')
      
      const getColLetter = (index: number) => {
        let letter = '';
        while (index >= 0) {
          letter = String.fromCharCode((index % 26) + 65) + letter;
          index = Math.floor(index / 26) - 1;
        }
        return letter;
      };

      surveyDims.forEach((dim: any, dIdx: number) => {
        dim.questions.forEach((q: any, qIdx: number) => {
          surveyCols.push({ header: `ข้อ ${dIdx+1}.${qIdx+1}\n${q.text}`, width: 15, align: "center", wrapText: true, isNumber: true });
          questionCols[q.id] = getColLetter(colIdx - 1);
          colIdx++;
        });
        surveyCols.push({ header: `เฉลี่ยด้านที่ ${dIdx+1}`, width: 15, align: "center", wrapText: true, isNumber: true });
        colIdx++;
      });
      surveyCols.push({ header: `เฉลี่ยรวม`, width: 15, align: "center", wrapText: true, isNumber: true });

      const surveyDataStartRow = nextRow + 1;
      const surveyRows = submissions.map((sub: any, idx: number) => {
        const studentIdNum = sub.email ? sub.email.split('@')[0].replace(/\D/g, '') : '-';
        const rowNum = surveyDataStartRow + idx;
        const rowData: any[] = [idx + 1, studentIdNum || "-", sub.name];
        
        surveyDims.forEach((dim: any) => {
          const dimQCols: string[] = [];
          dim.questions.forEach((q: any) => {
            const val = sub.ratings[q.id] || 0;
            rowData.push(val);
            dimQCols.push(`${questionCols[q.id]}${rowNum}`);
          });
          // Dimension average formula
          rowData.push({ formula: `IFERROR(AVERAGE(${dimQCols.join(',')}), 0)` });
        });
        
        // Overall average formula
        const dimAvgCols = surveyDims.map((_: any, dIdx: number) => {
          const qCount = surveyDims.slice(0, dIdx + 1).reduce((acc: number, d: any) => acc + d.questions.length + 1, 0);
          return `${getColLetter(2 + qCount)}${rowNum}`;
        });
        rowData.push({ formula: `IFERROR(AVERAGE(${dimAvgCols.join(',')}), 0)` });

        return rowData;
      });

      formatStyledTable(wsSurvey, {
        startRow: nextRow,
        columns: surveyCols,
        data: surveyRows,
        freezeHeader: true,
      });
      const surveyDataEndRow = surveyDataStartRow + Math.max(0, submissions.length - 1);

      // ============================================================================
      // SHEET 3: สรุปหาค่า E1E2
      // ============================================================================
      const wsE1E2 = wb.addWorksheet("สรุปหาค่า E1-E2", { views: [{ showGridLines: true }], properties: { tabColor: { argb: "FFD97706" } } });
      
      const getMaxScoreValue = (key: string) => {
        const st = allStudentsInAllCourses.find((s: any) => s[key] && s[key] !== "-");
        if (!st) return 1;
        const parts = st[key].split("/");
        return parts.length > 1 ? parseFloat(parts[1]) || 1 : 1;
      };
      
      const quizMaxNum = getMaxScoreValue("quiz");
      const postMaxNum = getMaxScoreValue("postTest");
      
      nextRow = addHeaderBanner(wsE1E2, {
        title: "สรุปหาค่าประสิทธิภาพ (E1/E2)",
        subtitle: `รายวิชา: ${safeCourseTitle}`,
        infoList: [],
        totalCols: 4,
        theme: "amber",
      });

      const e1e2Cols: ColumnDefinition[] = [
        { header: "รายการ", width: 30, align: "left" },
        { header: "คะแนนเฉลี่ย", width: 20, align: "center", numFmt: "0.00" },
        { header: "คิดเป็นร้อยละ (%)", width: 20, align: "center", numFmt: "0.00" },
        { header: "หมายเหตุ", width: 30, align: "left" },
      ];
      
      const e1e2Rows = [
        [
          "คะแนนระหว่างเรียน (E1)", 
          { formula: `IFERROR(AVERAGE(${firstScoreSheetName}!H${globalScoreDataStart}:H${globalScoreDataEnd}), 0)` }, 
          { formula: `IFERROR((B${nextRow+1}/${quizMaxNum})*100, 0)` }, 
          `คะแนนเต็ม ${quizMaxNum}`
        ],
        [
          "คะแนนหลังเรียน (E2)", 
          { formula: `IFERROR(AVERAGE(${firstScoreSheetName}!F${globalScoreDataStart}:F${globalScoreDataEnd}), 0)` }, 
          { formula: `IFERROR((B${nextRow+2}/${postMaxNum})*100, 0)` }, 
          `คะแนนเต็ม ${postMaxNum}`
        ],
      ];

      formatStyledTable(wsE1E2, {
        startRow: nextRow,
        columns: e1e2Cols,
        data: e1e2Rows,
      });

      // ============================================================================
      // SHEET 4: สรุปหาค่าสอบก่อน-หลัง (Pre/Post Test)
      // ============================================================================
      const wsPrePost = wb.addWorksheet("สรุปหาค่าสอบก่อน-หลัง", { views: [{ showGridLines: true }], properties: { tabColor: { argb: "FF4F46E5" } } });
      
      nextRow = addHeaderBanner(wsPrePost, {
        title: "สรุปเปรียบเทียบคะแนนก่อนเรียน - หลังเรียน",
        subtitle: `รายวิชา: ${safeCourseTitle}`,
        infoList: [],
        totalCols: 5,
        theme: "indigo",
      });

      const prePostCols: ColumnDefinition[] = [
        { header: "รายการ", width: 30, align: "left" },
        { header: "N", width: 15, align: "center" },
        { header: "ค่าเฉลี่ย (Mean)", width: 20, align: "center", numFmt: "0.00" },
        { header: "ส่วนเบี่ยงเบน (S.D.)", width: 20, align: "center", numFmt: "0.00" },
        { header: "ร้อยละ", width: 15, align: "center", numFmt: "0.00" },
      ];
      
      const preMaxNum = getMaxScoreValue("preTest");

      const prePostRows = [
        [
          "คะแนนก่อนเรียน (Pre-test)", 
          allStudentsInAllCourses.length > 0 ? allCoursesData[0].students.length : 0,
          { formula: `IFERROR(AVERAGE(${firstScoreSheetName}!E${globalScoreDataStart}:E${globalScoreDataEnd}), 0)` }, 
          { formula: `IFERROR(STDEV.S(${firstScoreSheetName}!E${globalScoreDataStart}:E${globalScoreDataEnd}), 0)` },
          { formula: `IFERROR((C${nextRow+1}/${preMaxNum})*100, 0)` }
        ],
        [
          "คะแนนหลังเรียน (Post-test)", 
          allStudentsInAllCourses.length > 0 ? allCoursesData[0].students.length : 0,
          { formula: `IFERROR(AVERAGE(${firstScoreSheetName}!F${globalScoreDataStart}:F${globalScoreDataEnd}), 0)` }, 
          { formula: `IFERROR(STDEV.S(${firstScoreSheetName}!F${globalScoreDataStart}:F${globalScoreDataEnd}), 0)` },
          { formula: `IFERROR((C${nextRow+2}/${postMaxNum})*100, 0)` }
        ],
        [
          "คะแนนพัฒนาการ (Gain Score)", 
          allStudentsInAllCourses.length > 0 ? allCoursesData[0].students.length : 0,
          { formula: `IFERROR(AVERAGE(${firstScoreSheetName}!G${globalScoreDataStart}:G${globalScoreDataEnd}), 0)` }, 
          { formula: `IFERROR(STDEV.S(${firstScoreSheetName}!G${globalScoreDataStart}:G${globalScoreDataEnd}), 0)` },
          { formula: `IFERROR(C${nextRow+2}-C${nextRow+1}, 0)` }
        ]
      ];

      formatStyledTable(wsPrePost, {
        startRow: nextRow,
        columns: prePostCols,
        data: prePostRows,
      });

      // ============================================================================
      // SHEET 5: สรุปผลการประเมิน (Survey Summary)
      // ============================================================================
      const wsSurveySum = wb.addWorksheet("สรุปผลการประเมิน", { views: [{ showGridLines: true }], properties: { tabColor: { argb: "FF0891B2" } } });
      
      nextRow = addHeaderBanner(wsSurveySum, {
        title: "สรุปผลการประเมินความพึงพอใจ",
        subtitle: `รายวิชา: ${safeCourseTitle}`,
        infoList: [],
        totalCols: 6,
        theme: "blue",
      });

      const surveySumCols: ColumnDefinition[] = [
        { header: "ด้าน", width: 10, align: "center" },
        { header: "หัวข้อการประเมิน", width: 50, align: "left", wrapText: true },
        { header: "N", width: 10, align: "center" },
        { header: "ค่าเฉลี่ย\n(Mean)", width: 15, align: "center", numFmt: "0.00" },
        { header: "ส่วนเบี่ยงเบน\n(S.D.)", width: 15, align: "center", numFmt: "0.00" },
        { header: "ระดับความพึงพอใจ", width: 25, align: "center" },
      ];

      const surveySumRows: any[] = [];
      const surveyRawName = `'แบบประเมินความพึงพอใจ'`;
      
      let sumRowIdx = nextRow + 1;
      surveyDims.forEach((dim: any, dIdx: number) => {
        surveySumRows.push([
          `ด้านที่ ${dIdx+1}`,
          dim.title,
          submissions.length,
          { formula: `IFERROR(AVERAGE(${surveyRawName}!${questionCols[dim.questions[0].id]}${surveyDataStartRow}:${questionCols[dim.questions[dim.questions.length-1].id]}${surveyDataEndRow}), 0)` },
          { formula: `IFERROR(STDEV.S(${surveyRawName}!${questionCols[dim.questions[0].id]}${surveyDataStartRow}:${questionCols[dim.questions[dim.questions.length-1].id]}${surveyDataEndRow}), 0)` },
          { formula: `IF(D${sumRowIdx}>=4.51, "มากที่สุด", IF(D${sumRowIdx}>=3.51, "มาก", IF(D${sumRowIdx}>=2.51, "ปานกลาง", IF(D${sumRowIdx}>=1.51, "น้อย", "น้อยที่สุด"))))` }
        ]);
        sumRowIdx++;

        dim.questions.forEach((q: any, qIdx: number) => {
          const cLet = questionCols[q.id];
          surveySumRows.push([
            `${dIdx+1}.${qIdx+1}`,
            q.text,
            submissions.length,
            { formula: `IFERROR(AVERAGE(${surveyRawName}!${cLet}${surveyDataStartRow}:${cLet}${surveyDataEndRow}), 0)` },
            { formula: `IFERROR(STDEV.S(${surveyRawName}!${cLet}${surveyDataStartRow}:${cLet}${surveyDataEndRow}), 0)` },
            { formula: `IF(D${sumRowIdx}>=4.51, "มากที่สุด", IF(D${sumRowIdx}>=3.51, "มาก", IF(D${sumRowIdx}>=2.51, "ปานกลาง", IF(D${sumRowIdx}>=1.51, "น้อย", "น้อยที่สุด"))))` }
          ]);
          sumRowIdx++;
        });
      });

      formatStyledTable(wsSurveySum, {
        startRow: nextRow,
        columns: surveySumCols,
        data: surveySumRows,
      });

      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `สรุปค่างานวิจัยในชั้นเรียน_รวม_${dateStr}.xlsx`;

      await downloadWorkbook(wb, fileName);
      toast.success("ส่งออกรายงานสรุปงานวิจัยสำเร็จ");
    } catch (e) {
      console.error("Export failed:", e);
      toast.error("เกิดข้อผิดพลาดในการสร้างไฟล์รายงานวิจัย");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:opacity-95 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      style={{ backgroundColor: '#2563EB' }}
      title="ดาวน์โหลดไฟล์สรุปข้อมูลวิจัยทั้งหมดในรูปแบบ Excel ที่ฝังสูตรคำนวณอัตโนมัติ"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-4 h-4" />
      )}
      {isExporting ? "กำลังสร้างรายงานวิจัย..." : "สรุปค่างานวิจัย (Excel)"}
    </button>
  );
}
