import ExcelJS from "exceljs";

// ==========================================
// LMS Executive Excel Theme Palette & Config
// ==========================================
export const EXCEL_THEME = {
  colors: {
    primaryDark: "1E3A8A",    // Deep Navy
    primaryHeader: "1E293B",  // Slate 800
    primaryAccent: "2563EB",  // Royal Blue
    emerald: "059669",        // Emerald 600
    emeraldDark: "065F46",    // Emerald 800
    borderLight: "CBD5E1",    // Slate 300
    borderSoft: "E2E8F0",     // Slate 200
    zebraLight: "F8FAFC",     // Slate 50
    zebraWhite: "FFFFFF",
    textDark: "0F172A",       // Slate 900
    textMuted: "64748B",      // Slate 500
    white: "FFFFFF",

    // Status Badges (Soft background + dark text)
    badgeSuccessBg: "DCFCE7",   // Soft Green
    badgeSuccessText: "166534",
    badgeInfoBg: "DBEAFE",      // Soft Blue
    badgeInfoText: "1E40AF",
    badgeWarningBg: "FEF3C7",   // Soft Amber
    badgeWarningText: "92400E",
    badgeDangerBg: "FEE2E2",    // Soft Rose/Red
    badgeDangerText: "991B1B",
    badgeNeutralBg: "F1F5F9",   // Soft Slate
    badgeNeutralText: "475569",

    // KPI Cards
    cardBg1: "EFF6FF",          // Light Blue
    cardBorder1: "BFDBFE",
    cardBg2: "ECFDF5",          // Light Emerald
    cardBorder2: "A7F3D0",
    cardBg3: "FEF3C7",          // Light Amber
    cardBorder3: "FDE68A",
    cardBg4: "F3E8FF",          // Light Purple
    cardBorder4: "E9D5FF",
  },
};

/**
 * Creates a new pre-configured Workbook with document properties
 */
export function createLMSWorkbook(title: string = "LMS Report"): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ระบบจัดการเรียนรู้ LMS (AI-Powered LMS)";
  wb.lastModifiedBy = "LMS Administrator";
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = title;
  return wb;
}

/**
 * Adds a modern, executive Title Banner with metadata
 * Returns the next available row index
 */
export function addHeaderBanner(
  ws: ExcelJS.Worksheet,
  options: {
    title: string;
    subtitle?: string;
    infoList?: string[];
    totalCols: number;
    theme?: "navy" | "emerald" | "indigo";
  }
): number {
  const { title, subtitle, infoList = [], totalCols, theme = "navy" } = options;
  const colCount = Math.max(totalCols, 6);

  const bgGradientColor = 
    theme === "emerald" ? EXCEL_THEME.colors.emeraldDark :
    theme === "indigo" ? "312E81" : 
    EXCEL_THEME.colors.primaryDark;

  // Row 1: Spacing
  ws.addRow([]);
  ws.getRow(1).height = 10;

  // Row 2: Main Title Banner
  const titleRow = ws.getRow(2);
  titleRow.height = 34;
  ws.mergeCells(2, 1, 2, colCount);
  const titleCell = ws.getCell(2, 1);
  titleCell.value = `  ${title}`;
  titleCell.font = { name: "Arial", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${bgGradientColor}` },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  // Row 3: Subtitle / Date Info
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subRow = ws.getRow(3);
  subRow.height = 24;
  ws.mergeCells(3, 1, 3, colCount);
  const subCell = ws.getCell(3, 1);
  
  const subText = [
    subtitle || "ระบบการจัดการเรียนการสอนและประเมินผลออนไลน์",
    `ส่งออกข้อมูลเมื่อ: ${dateFormatted} น.`,
    ...infoList,
  ].filter(Boolean).join("  |  ");

  subCell.value = `  ${subText}`;
  subCell.font = { name: "Arial", size: 10, color: { argb: "FFFFFFFF" }, italic: true };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${theme === "emerald" ? "047857" : theme === "indigo" ? "3730A3" : "1E40AF"}` },
  };
  subCell.alignment = { vertical: "middle", horizontal: "left" };

  // Row 4: Blank Spacing
  ws.addRow([]);
  ws.getRow(4).height = 12;

  return 5; // Next row for content
}

/**
 * Adds horizontal KPI summary metric cards
 * Returns the next available row index
 */
export function addKpiCards(
  ws: ExcelJS.Worksheet,
  cards: Array<{
    label: string;
    value: string | number;
    sublabel?: string;
    colorType?: "blue" | "emerald" | "amber" | "purple";
  }>,
  startRow: number = 5
): number {
  if (!cards || cards.length === 0) return startRow;

  const cardColors = {
    blue: { bg: EXCEL_THEME.colors.cardBg1, border: EXCEL_THEME.colors.cardBorder1, text: "1E40AF" },
    emerald: { bg: EXCEL_THEME.colors.cardBg2, border: EXCEL_THEME.colors.cardBorder2, text: "065F46" },
    amber: { bg: EXCEL_THEME.colors.cardBg3, border: EXCEL_THEME.colors.cardBorder3, text: "92400E" },
    purple: { bg: EXCEL_THEME.colors.cardBg4, border: EXCEL_THEME.colors.cardBorder4, text: "6B21A8" },
  };

  const labelRow = ws.getRow(startRow);
  const valueRow = ws.getRow(startRow + 1);
  const sublabelRow = ws.getRow(startRow + 2);

  labelRow.height = 18;
  valueRow.height = 26;
  sublabelRow.height = 16;

  cards.forEach((card, idx) => {
    // Each card spans 2 columns
    const colStart = idx * 2 + 1;
    const colEnd = colStart + 1;
    const theme = cardColors[card.colorType || (idx % 2 === 0 ? "blue" : "emerald")];

    // Merge for 3 rows
    ws.mergeCells(startRow, colStart, startRow, colEnd);
    ws.mergeCells(startRow + 1, colStart, startRow + 1, colEnd);
    ws.mergeCells(startRow + 2, colStart, startRow + 2, colEnd);

    // Label
    const lCell = ws.getCell(startRow, colStart);
    lCell.value = card.label;
    lCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF64748B" } };
    lCell.alignment = { vertical: "middle", horizontal: "center" };

    // Value
    const vCell = ws.getCell(startRow + 1, colStart);
    vCell.value = card.value;
    vCell.font = { name: "Arial", size: 15, bold: true, color: { argb: `FF${theme.text}` } };
    vCell.alignment = { vertical: "middle", horizontal: "center" };

    // Sublabel
    const sCell = ws.getCell(startRow + 2, colStart);
    sCell.value = card.sublabel || "";
    sCell.font = { name: "Arial", size: 8, color: { argb: "FF94A3B8" } };
    sCell.alignment = { vertical: "middle", horizontal: "center" };

    // Fill & Border
    for (let r = startRow; r <= startRow + 2; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        const cell = ws.getCell(r, c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${theme.bg}` }
        };
        cell.border = {
          top: r === startRow ? { style: "thin", color: { argb: `FF${theme.border}` } } : undefined,
          bottom: r === startRow + 2 ? { style: "medium", color: { argb: `FF${theme.border}` } } : undefined,
          left: c === colStart ? { style: "thin", color: { argb: `FF${theme.border}` } } : undefined,
          right: c === colEnd ? { style: "thin", color: { argb: `FF${theme.border}` } } : undefined,
        };
      }
    }
  });

  // Add spacing row after cards
  const spaceRow = ws.getRow(startRow + 3);
  spaceRow.height = 14;

  return startRow + 4; // Next row for table
}

export interface ColumnDefinition {
  header: string;
  key?: string;
  width?: number;
  align?: "left" | "center" | "right";
  isNumber?: boolean;
  isPercent?: boolean;
  numFmt?: string;
  wrapText?: boolean;
}

/**
 * Builds and formats a complete table with headers, zebra rows, borders, and status styles
 */
export function formatStyledTable(
  ws: ExcelJS.Worksheet,
  options: {
    startRow: number;
    columns: ColumnDefinition[];
    data: any[][];
    statusColumnIndex?: number; // 0-indexed column with status to auto-colorize badge
    freezeHeader?: boolean;
    hasTotalsRow?: boolean;
    totalsRowData?: any[];
  }
) {
  const {
    startRow,
    columns,
    data,
    statusColumnIndex,
    freezeHeader = true,
    hasTotalsRow = false,
    totalsRowData,
  } = options;

  const headerRowIndex = startRow;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.height = 28;

  // 1. Set Table Header
  columns.forEach((col, idx) => {
    const colNum = idx + 1;
    const cell = headerRow.getCell(colNum);
    cell.value = col.header;
    cell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${EXCEL_THEME.colors.primaryHeader}` },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: col.align || "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: `FF${EXCEL_THEME.colors.primaryDark}` } },
      bottom: { style: "medium", color: { argb: `FF${EXCEL_THEME.colors.primaryDark}` } },
      left: { style: "thin", color: { argb: "FF475569" } },
      right: { style: "thin", color: { argb: "FF475569" } },
    };
  });

  // 2. Set Data Rows with Zebra Striping
  let currentRowIdx = headerRowIndex + 1;
  data.forEach((rowValues, rIdx) => {
    const row = ws.getRow(currentRowIdx);
    row.height = 22;
    const isEven = rIdx % 2 === 0;
    const rowBg = isEven ? EXCEL_THEME.colors.zebraWhite : EXCEL_THEME.colors.zebraLight;

    rowValues.forEach((val, cIdx) => {
      const colNum = cIdx + 1;
      const cell = row.getCell(colNum);
      const colDef = columns[cIdx] || {};

      cell.value = val !== null && val !== undefined ? val : "-";
      cell.font = { name: "Arial", size: 10, color: { argb: `FF${EXCEL_THEME.colors.textDark}` } };
      cell.alignment = {
        vertical: "middle",
        horizontal: colDef.align || (typeof val === "number" ? "right" : "left"),
        wrapText: Boolean(colDef.wrapText),
      };

      if (colDef.numFmt) {
        cell.numFmt = colDef.numFmt;
      } else if (colDef.isPercent) {
        cell.numFmt = "0.0%";
      }

      // Default zebra background
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${rowBg}` },
      };

      cell.border = {
        top: { style: "thin", color: { argb: `FF${EXCEL_THEME.colors.borderSoft}` } },
        bottom: { style: "thin", color: { argb: `FF${EXCEL_THEME.colors.borderSoft}` } },
        left: { style: "thin", color: { argb: `FF${EXCEL_THEME.colors.borderSoft}` } },
        right: { style: "thin", color: { argb: `FF${EXCEL_THEME.colors.borderSoft}` } },
      };

      // Check Status Badge Colorization
      if (statusColumnIndex !== undefined && cIdx === statusColumnIndex) {
        applyStatusBadgeStyle(cell, String(val));
      }
    });

    currentRowIdx++;
  });

  // 3. Totals / Summary Row if requested
  if (hasTotalsRow && totalsRowData) {
    const totRow = ws.getRow(currentRowIdx);
    totRow.height = 26;
    totalsRowData.forEach((val, cIdx) => {
      const colNum = cIdx + 1;
      const cell = totRow.getCell(colNum);
      const colDef = columns[cIdx] || {};

      cell.value = val !== null && val !== undefined ? val : "";
      cell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: `FF${EXCEL_THEME.colors.textDark}` } };
      cell.alignment = {
        vertical: "middle",
        horizontal: colDef.align || (typeof val === "number" ? "right" : "left"),
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: `FF${EXCEL_THEME.colors.borderLight}` } },
        bottom: { style: "double", color: { argb: `FF${EXCEL_THEME.colors.primaryDark}` } },
        left: { style: "thin", color: { argb: `FF${EXCEL_THEME.colors.borderLight}` } },
        right: { style: "thin", color: { argb: `FF${EXCEL_THEME.colors.borderLight}` } },
      };
    });
    currentRowIdx++;
  }

  // 4. Freeze Header if requested
  if (freezeHeader) {
    ws.views = [
      {
        state: "frozen",
        xSplit: 0,
        ySplit: headerRowIndex,
        showGridLines: true,
      },
    ];
  } else {
    ws.views = [{ showGridLines: true }];
  }

  // 5. Calculate and Apply Column Widths
  autoFitColumns(ws, columns, data);

  return currentRowIdx;
}

/**
 * Applies soft status badge styling to a cell based on text keywords
 */
export function applyStatusBadgeStyle(cell: ExcelJS.Cell, statusText: string) {
  const text = (statusText || "").trim();

  // Green / Pass / Complete / Good
  if (
    text.includes("เรียนจบ") ||
    text.includes("ผ่าน") ||
    text.includes("คุณภาพดี") ||
    text.includes("Active") ||
    text.includes("เสร็จสมบูรณ์") ||
    text.includes("มากที่สุด") ||
    text.includes("มีประกาศนียบัตร")
  ) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${EXCEL_THEME.colors.badgeSuccessBg}` } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${EXCEL_THEME.colors.badgeSuccessText}` } };
  }
  // Blue / In progress / Good / Moderate
  else if (text.includes("กำลังเรียน") || text.includes("มาก") || text.includes("ปานกลาง")) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${EXCEL_THEME.colors.badgeInfoBg}` } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${EXCEL_THEME.colors.badgeInfoText}` } };
  }
  // Amber / Inactive / Pending / Warning
  else if (
    text.includes("ขาดการติดต่อ") ||
    text.includes("ยังไม่เริ่ม") ||
    text.includes("ยังไม่") ||
    text.includes("รอการประเมิน") ||
    text.includes("พอใช้")
  ) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${EXCEL_THEME.colors.badgeWarningBg}` } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${EXCEL_THEME.colors.badgeWarningText}` } };
  }
  // Red / Danger / Revision / Fail
  else if (
    text.includes("ปรับปรุง") ||
    text.includes("ไม่ผ่าน") ||
    text.includes("น้อย") ||
    text.includes("ตก")
  ) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${EXCEL_THEME.colors.badgeDangerBg}` } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${EXCEL_THEME.colors.badgeDangerText}` } };
  }
}

/**
 * Calculates optimal column widths based on headers and row values,
 * correctly handling Thai character length and bounds.
 */
export function autoFitColumns(
  ws: ExcelJS.Worksheet,
  columns: ColumnDefinition[],
  data: any[][]
) {
  const getVisualLength = (str: string): number => {
    if (!str) return 0;
    // Strip Thai upper/lower vowels and tone marks that do not occupy horizontal column space
    const visibleChars = str.replace(/[\u0E31\u0E34-\u0E3E\u0E47-\u0E4E]/g, "");
    return visibleChars.length;
  };

  columns.forEach((colDef, cIdx) => {
    const colNum = cIdx + 1;
    if (colDef.width) {
      ws.getColumn(colNum).width = colDef.width;
      return;
    }

    let maxLength = getVisualLength(colDef.header);

    // Check up to first 100 rows to find max width
    const sampleLimit = Math.min(data.length, 100);
    for (let r = 0; r < sampleLimit; r++) {
      const val = data[r]?.[cIdx];
      if (val !== null && val !== undefined) {
        const len = getVisualLength(String(val));
        if (len > maxLength) maxLength = len;
      }
    }

    // Add safe padding
    let calculatedWidth = Math.max(maxLength + 4, 12);
    if (colDef.wrapText) {
      calculatedWidth = Math.min(calculatedWidth, 48);
    } else {
      calculatedWidth = Math.min(Math.max(calculatedWidth, 12), 38);
    }

    ws.getColumn(colNum).width = calculatedWidth;
  });
}

/**
 * Triggers direct browser download of the generated workbook as a modern .xlsx file
 */
export async function downloadWorkbook(wb: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
