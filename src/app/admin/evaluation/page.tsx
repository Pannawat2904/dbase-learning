"use client";

import * as XLSX from "xlsx";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/ConfirmDialog";
import { 
  Star, 
  Lock, 
  Unlock, 
  Users, 
  BarChart3, 
  Printer, 
  MessageSquare, 
  RefreshCw,
  TrendingUp,
  Plus,
  Trash2,
  Edit3,
  Save,
  Check,
  HelpCircle,
  FolderPlus,
  FilePlus,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  UserX,
  UserCheck,
  Mail,
  Copy,
  CheckCheck,
  Search
} from "lucide-react";
import AutoRefresh from "@/components/admin/AutoRefresh";
import SatisfactionCharts from "@/components/admin/SatisfactionCharts";

export interface SurveyDimensionItem {
  id: string;
  text: string;
}

export interface SurveyDimension {
  id: string;
  title: string;
  description?: string;
  items: SurveyDimensionItem[];
}

export default function AdminEvaluationPage() {
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"builder" | "overview" | "items" | "suggestions" | "respondents" | "pending">("builder");

  // Pending Students State
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingSort, setPendingSort] = useState<"id_asc" | "id_desc" | "name_asc" | "name_desc">("id_asc");
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [copiedList, setCopiedList] = useState(false);

  // Form Builder State
  const [surveyTitle, setSurveyTitle] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [dimensions, setDimensions] = useState<SurveyDimension[]>([]);

  // Section / Item Edit States
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [addingItemToDimId, setAddingItemToDimId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/survey?mode=analytics', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch survey analytics');
      const data = await res.json();
      setAnalytics(data);
      setSurveyTitle(data.title || "แบบประเมินความพึงพอใจต่อการใช้งานระบบเรียนรู้วิชาโปรแกรมฐานข้อมูลอัจฉริยะ (DBASE Learning AI)");
      setSurveyDescription(data.description || "คำชี้แจง: โปรดเลือกคะแนนระดับความพึงพอใจที่ตรงกับความคิดเห็นของท่านมากที่สุด โดยแบ่งเป็น 5 ระดับ (5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด)");
      setDimensions(Array.isArray(data.dimensions) ? data.dimensions : []);
    } catch (err) {
      console.error("Error loading survey analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleToggleStatus = async () => {
    if (!analytics) return;
    const newState = !analytics.isOpen;
    try {
      setToggling(true);
      const res = await fetch('/api/survey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: newState })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setAnalytics((prev: any) => ({
        ...prev,
        isOpen: newState
      }));
      toast.success(newState ? "เปิดระบบให้นักเรียนทำแบบประเมินแล้ว" : "ปิดระบบรับแบบประเมินเรียบร้อยแล้ว");
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    } finally {
      setToggling(false);
    }
  };

  // ----------------------------------------------------
  // FORM BUILDER HANDLERS
  // ----------------------------------------------------
  const handleAddSection = () => {
    if (!newSectionTitle.trim()) {
      toast.warning("กรุณากรอกชื่อส่วนการประเมิน");
      return;
    }
    const newDim: SurveyDimension = {
      id: `dim_${Date.now()}`,
      title: newSectionTitle.trim(),
      description: newSectionDesc.trim() || undefined,
      items: []
    };
    setDimensions(prev => [...prev, newDim]);
    setNewSectionTitle("");
    setNewSectionDesc("");
    setIsAddingSection(false);
  };

  const handleDeleteSection = async (dimId: string) => {
    const confirmed = await confirmDialog({
      title: "ยืนยันการลบส่วนการประเมิน",
      message: "คุณต้องการลบส่วนการประเมินนี้พร้อมข้อคำถามทั้งหมดใช่หรือไม่?",
      type: "danger",
      confirmText: "ลบส่วนนี้"
    });
    if (!confirmed) return;
    setDimensions(prev => prev.filter(d => d.id !== dimId));
  };

  const handleAddItem = (dimId: string) => {
    if (!newItemText.trim()) {
      toast.warning("กรุณากรอกข้อความรายการประเมิน");
      return;
    }
    setDimensions(prev => prev.map(d => {
      if (d.id === dimId) {
        return {
          ...d,
          items: [
            ...d.items,
            { id: `item_${Date.now()}_${Math.floor(Math.random()*1000)}`, text: newItemText.trim() }
          ]
        };
      }
      return d;
    }));
    setNewItemText("");
    setAddingItemToDimId(null);
  };

  const handleDeleteItem = (dimId: string, itemId: string) => {
    setDimensions(prev => prev.map(d => {
      if (d.id === dimId) {
        return {
          ...d,
          items: d.items.filter(it => it.id !== itemId)
        };
      }
      return d;
    }));
  };

  const handleUpdateItemText = (dimId: string, itemId: string, newText: string) => {
    setDimensions(prev => prev.map(d => {
      if (d.id === dimId) {
        return {
          ...d,
          items: d.items.map(it => it.id === itemId ? { ...it, text: newText } : it)
        };
      }
      return d;
    }));
  };

  const handleSaveFormStructure = async () => {
    try {
      setSavingForm(true);
      setSaveSuccessMsg("");
      const res = await fetch('/api/survey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: surveyTitle,
          description: surveyDescription,
          dimensions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save form structure');

      setSaveSuccessMsg("บันทึกส่วนและรายการประเมินความพึงพอใจสำเร็จ!");
      toast.success("บันทึกส่วนและรายการประเมินสำเร็จ!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
      fetchAnalytics();
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingForm(false);
    }
  };

  const handleLoadTemplate = async () => {
    if (dimensions.length > 0) {
      const confirmed = await confirmDialog({
        title: "โหลดแม่แบบตัวอย่าง 4 ด้าน",
        message: "การโหลดแม่แบบจะแทนที่รายการประเมินที่มีอยู่เดิม คุณต้องการดำเนินการต่อหรือไม่?",
        type: "warning",
        confirmText: "แทนที่ด้วยแม่แบบ"
      });
      if (!confirmed) return;
    }
    const template: SurveyDimension[] = [
      {
        id: "content",
        title: "ด้านที่ 1: ด้านเนื้อหาและการจัดกิจกรรมการเรียนรู้",
        description: "ความถูกต้อง ชัดเจน และความสอดคล้องของเนื้อหา",
        items: [
          { id: "c1", text: "1.1 เนื้อหาในบทเรียนมีความทันสมัย ถูกต้อง และสอดคล้องกับวัตถุประสงค์การเรียนรู้" },
          { id: "c2", text: "1.2 เนื้อหามีการเรียงลำดับจากง่ายไปหายากอย่างเป็นขั้นตอน เข้าใจง่าย" },
          { id: "c3", text: "1.3 แบบทดสอบและแบบฝึกหัดท้ายบทมีความเหมาะสมและวัดความรู้ได้ตรงตามเนื้อหา" }
        ]
      },
      {
        id: "design",
        title: "ด้านที่ 2: ด้านการออกแบบระบบและการใช้งาน (UI/UX)",
        description: "ความสวยงาม ความสะดวก และความง่ายในการเข้าถึง",
        items: [
          { id: "d1", text: "2.1 หน้าตาของระบบ (User Interface) มีความทันสมัย สวยงาม และน่าใช้งาน" },
          { id: "d2", text: "2.2 เมนูการใช้งานและการเข้าถึงบทเรียนมีความสะดวกและไม่ซับซ้อน" },
          { id: "d3", text: "2.3 ระบบสามารถแสดงผลได้อย่างถูกต้องบนอุปกรณ์ต่างๆ (คอมพิวเตอร์ แท็บเล็ต สมาร์ทโฟน)" }
        ]
      },
      {
        id: "ai_tutor",
        title: "ด้านที่ 3: ด้านระบบผู้ช่วย AI อัจฉริยะ (Gemini AI Tutor)",
        description: "ประสิทธิภาพการตอบคำถามและการช่วยเหลือการเรียนรู้",
        items: [
          { id: "a1", text: "3.1 ระบบ AI ให้คำอธิบายและตอบคำถามเกี่ยวกับฐานข้อมูลได้อย่างถูกต้องและรวดเร็ว" },
          { id: "a2", text: "3.2 AI ช่วยกระตุ้นความสนใจและแนะนำแนวทางการแก้ไขปัญหาได้อย่างตรงจุด" }
        ]
      },
      {
        id: "benefit",
        title: "ด้านที่ 4: ด้านประโยชน์และการพัฒนาทักษะที่ได้รับ",
        description: "การพัฒนาความรู้และสามารถนำไปประยุกต์ใช้ได้จริง",
        items: [
          { id: "b1", text: "4.1 ระบบนี้ช่วยให้ผู้เรียนมีความเข้าใจในวิชาโปรแกรมฐานข้อมูลเพิ่มมากขึ้น" },
          { id: "b2", text: "4.2 ผู้เรียนสามารถนำความรู้และทักษะที่ได้ไปประยุกต์ใช้ในการเรียนและการทำงานจริงได้" }
        ]
      }
    ];
    setDimensions(template);
  };

  const handleExportExcel = () => {
    try {
      if (!analytics || analytics.totalRespondents === 0) {
        toast.warning("ยังไม่มีข้อมูลสำหรับส่งออก");
        return;
      }
      
      const wb = XLSX.utils.book_new();
      
      // 1. Overview Sheet
      const overviewData = [
        ["รายงานผลการประเมินความพึงพอใจ"],
        ["จำนวนผู้ตอบประเมิน", `${analytics.totalRespondents} คน (คิดเป็น ${analytics.responseRate}%)`],
        ["คะแนนเฉลี่ยรวม", analytics.overallMean],
        ["ส่วนเบี่ยงเบนมาตรฐาน (SD)", analytics.overallSD],
        ["ระดับความพึงพอใจภาพรวม", analytics.overallQuality],
        [],
        ["ผลการประเมินรายด้าน"],
        ["ด้านที่", "หัวข้อการประเมิน", "ค่าเฉลี่ย", "SD", "ระดับความพึงพอใจ"]
      ];
      
      const dims = dimensions.length > 0 ? dimensions : (analytics?.dimensions || []);
      dims.forEach((dim: any, idx: number) => {
        const stat = analytics.dimensionStats?.[dim.id] || { mean: 0, sd: 0, quality: "-" };
        overviewData.push([`ด้านที่ ${idx + 1}`, dim.title, stat.mean, stat.sd, stat.quality]);
      });
      
      const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWs, "ภาพรวม");
      
      // 2. Items Sheet
      const itemsData = [
        ["ผลการประเมินรายข้อ"],
        ["หัวข้อ", "ค่าเฉลี่ย", "SD", "ระดับความพึงพอใจ"]
      ];
      
      dims.forEach((dim: any) => {
        (dim.items || []).forEach((item: any) => {
          const stat = analytics.itemStats?.[item.id] || { mean: 0, sd: 0, quality: "-" };
          itemsData.push([item.text, stat.mean, stat.sd, stat.quality]);
        });
      });
      
      const itemsWs = XLSX.utils.aoa_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(wb, itemsWs, "รายข้อ");
      
      // 3. Respondents Sheet
      if (analytics.respondentsList && analytics.respondentsList.length > 0) {
        const itemColumns: { id: string; label: string }[] = [];
        dims.forEach((dim: any, dimIdx: number) => {
          (dim.items || []).forEach((item: any, itemIdx: number) => {
            itemColumns.push({
              id: item.id,
              label: `ข้อ ${dimIdx + 1}.${itemIdx + 1}`
            });
          });
        });
        
        const respondentsData = analytics.respondentsList.map((r: any) => {
          const row: any = {
            "ชื่อ-นามสกุล": r.name,
            "อีเมล": r.email,
            "คะแนนเฉลี่ย": r.score,
            "ระดับคุณภาพ": r.quality,
            "วันที่ทำแบบประเมิน": r.submittedAt
          };
          
          // Add score for each item
          itemColumns.forEach(col => {
            row[col.label] = r.ratings?.[col.id] || "-";
          });
          
          return row;
        });
        const respondentsWs = XLSX.utils.json_to_sheet(respondentsData);
        XLSX.utils.book_append_sheet(wb, respondentsWs, "รายชื่อผู้ตอบ");
      }
      
      // 4. Pending Students Sheet
      if (analytics.pendingStudents && analytics.pendingStudents.length > 0) {
        const pendingData = analytics.pendingStudents.map((p: any, idx: number) => ({
          "ลำดับ": idx + 1,
          "รหัสประจำตัว": p.studentIdNum || "-",
          "ชื่อ-นามสกุล": p.name,
          "อีเมล": p.email,
          "สถานะ": "ยังไม่ทำแบบประเมิน"
        }));
        const pendingWs = XLSX.utils.json_to_sheet(pendingData);
        XLSX.utils.book_append_sheet(wb, pendingWs, "รายชื่อผู้ยังไม่ประเมิน");
      }
      
      // 5. Suggestions Sheet
      if (analytics.suggestions && analytics.suggestions.length > 0) {
        const suggestionsData = analytics.suggestions.map((s: any) => ({
          "ข้อเสนอแนะ": s.text,
          "ผู้เสนอ": s.name,
          "วันที่": s.date
        }));
        const suggestionsWs = XLSX.utils.json_to_sheet(suggestionsData);
        XLSX.utils.book_append_sheet(wb, suggestionsWs, "ข้อเสนอแนะ");
      }
      
      // Download
      XLSX.writeFile(wb, `รายงานความพึงพอใจ_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("ส่งออกไฟล์ Excel สำเร็จ");
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการส่งออก Excel");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  const isOpen = Boolean(analytics?.isOpen);
  const totalRespondents = analytics?.totalRespondents || 0;
  const totalStudents = analytics?.totalStudents || 0;
  const totalPending = analytics?.totalPending ?? (totalStudents > totalRespondents ? totalStudents - totalRespondents : 0);
  const responseRate = analytics?.responseRate || 0;
  const overallMean = analytics?.overallMean || 0;
  const overallSD = analytics?.overallSD || 0;
  const overallQuality = analytics?.overallQuality || "ยังไม่มีข้อมูล";
  const overallQualityColor = analytics?.overallQualityColor || "text-slate-600 bg-slate-100";
  const currentDimensions = dimensions.length > 0 ? dimensions : (analytics?.dimensions || []);
  const totalItemsCount = currentDimensions.flatMap((d: any) => d.items || []).length;

  const pendingStudentsList = analytics?.pendingStudents || [];
  const filteredPending = pendingStudentsList
    .filter((p: any) => {
      if (!pendingSearch.trim()) return true;
      const q = pendingSearch.toLowerCase().trim();
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.studentIdNum || "").includes(q)
      );
    })
    .sort((a: any, b: any) => {
      switch (pendingSort) {
        case "id_asc":
          return (a.studentIdNum || "").localeCompare(b.studentIdNum || "", "th", { numeric: true });
        case "id_desc":
          return (b.studentIdNum || "").localeCompare(a.studentIdNum || "", "th", { numeric: true });
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "", "th");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "", "th");
        default:
          return (a.studentIdNum || "").localeCompare(b.studentIdNum || "", "th", { numeric: true });
      }
    });

  const handleCopyEmails = () => {
    if (pendingStudentsList.length === 0) {
      toast.warning("ไม่มีอีเมลนักเรียนที่ยังไม่ประเมิน");
      return;
    }
    const emails = pendingStudentsList
      .map((p: any) => p.email)
      .filter((e: string) => e && e !== "-")
      .join(", ");
    navigator.clipboard.writeText(emails);
    setCopiedEmails(true);
    toast.success(`คัดลอกอีเมลนักเรียนที่ยังไม่ประเมิน ${pendingStudentsList.length} คน เรียบร้อยแล้ว`);
    setTimeout(() => setCopiedEmails(false), 3000);
  };

  const handleCopyList = () => {
    if (pendingStudentsList.length === 0) {
      toast.warning("ไม่มีรายชื่อนักเรียนที่ยังไม่ประเมิน");
      return;
    }
    const listText = `รายชื่อนักเรียนที่ยังไม่ประเมินความพึงพอใจ (${pendingStudentsList.length} คน):\n` +
      pendingStudentsList.map((p: any, idx: number) => 
        `${idx + 1}. ${p.studentIdNum ? `[${p.studentIdNum}] ` : ""}${p.name} (${p.email})`
      ).join("\n");
    navigator.clipboard.writeText(listText);
    setCopiedList(true);
    toast.success(`คัดลอกรายชื่อนักเรียน ${pendingStudentsList.length} คน เรียบร้อยแล้ว`);
    setTimeout(() => setCopiedList(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <AutoRefresh interval={5000} />

      {/* Top Header & Toggle Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              ประเมินความพึงพอใจ
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              isOpen 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' 
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
            }`}>
              {isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isOpen ? 'เปิดรับการประเมิน' : 'ปิดรับการประเมิน (ล็อค)'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            กำหนดส่วนและรายการประเมินเอง ควบคุมการเปิด-ปิดระบบ และดูรายงานสถิติวิจัยแบบ Real-time
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const pin = prompt("กรุณาใส่รหัสผ่านเพื่อยืนยันการล้างข้อมูล:");
              if (pin !== null) {
                if (pin === "84524092") {
                  const res = await fetch('/api/survey/clear', { 
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin })
                  });
                  if (res.ok) {
                    toast.success("ล้างข้อมูลสำเร็จ");
                    setTimeout(() => window.location.reload(), 1000);
                  } else {
                    const data = await res.json();
                    toast.error(data.error || "เกิดข้อผิดพลาดในการล้างข้อมูล");
                  }
                } else {
                  toast.error("รหัสผ่านไม่ถูกต้อง การล้างข้อมูลถูกยกเลิก");
                }
              }
            }}
            className="inline-flex items-center justify-center p-2.5 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-800 rounded-xl transition-all"
            title="ล้างข้อมูลการประเมินทั้งหมด (สำหรับทดสอบ)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            ส่งออก Excel
          </button>

          {/* Toggle Button */}
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className={`
              inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all
              ${isOpen 
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}
            `}
          >
            {toggling ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isOpen ? (
              <>
                <Lock className="w-4 h-4" />
                คลิกเพื่อปิดระบบ (ล็อค)
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                คลิกเพื่อเปิดให้นักเรียนทำ
              </>
            )}
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-xl font-bold">{surveyTitle || 'รายงานผลการประเมินความพึงพอใจ'}</h1>
        <p className="text-sm text-gray-600">วิชาโปรแกรมฐานข้อมูล (รหัสวิชา 21910-2012)</p>
        <p className="text-xs text-gray-500 mt-1">วันที่พิมพ์รายงาน: {new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1: Overall Mean */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${overallQualityColor}`}>
              {overallQuality}
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {overallMean > 0 ? overallMean.toFixed(2) : '-'} <span className="text-sm font-normal text-slate-400">/ 5.00</span>
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">คะแนนเฉลี่ยรวมทั้งระบบ (x̄)</p>
            <p className="text-xs text-slate-400 mt-0.5">ส่วนเบี่ยงเบนมาตรฐาน (S.D.) = {overallSD > 0 ? overallSD.toFixed(2) : '-'}</p>
          </div>
        </div>

        {/* Card 2: Total Respondents */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {responseRate}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {totalRespondents} <span className="text-sm font-normal text-slate-400">/ {totalStudents} คน</span>
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">จำนวนผู้ตอบแบบประเมิน</p>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${responseRate}%` }}></div>
            </div>

            <div className="flex items-center justify-between text-xs mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button"
                onClick={() => setActiveTab("respondents")} 
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 transition-colors"
                title="คลิกเพื่อดูรายชื่อผู้ตอบแล้ว"
              >
                <Check className="w-3.5 h-3.5" />
                ตอบแล้ว: {totalRespondents} คน
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab("pending")} 
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 transition-colors"
                title="คลิกเพื่อดูรายชื่อผู้ที่ยังไม่ทำแบบประเมิน"
              >
                <UserX className="w-3.5 h-3.5" />
                ยังไม่ประเมิน: {totalPending} คน
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Defined Items */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              {dimensions.length} ด้าน
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {totalItemsCount} <span className="text-sm font-normal text-slate-400">ข้อคำถาม</span>
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">รายการประเมินที่กำหนด</p>
            <p className="text-xs text-slate-400 mt-0.5">แบ่งตาม {dimensions.length} ส่วน</p>
          </div>
        </div>

        {/* Card 4: System Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className={`p-3 rounded-2xl ${isOpen ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'}`}>
              {isOpen ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <span className={`w-3 h-3 rounded-full animate-ping ${isOpen ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {isOpen ? 'กำลังเปิดรับข้อมูล' : 'ระบบถูกล็อคไว้'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isOpen ? 'นักเรียนสามารถเข้าทำแบบประเมินได้' : 'นักเรียนจะเห็นหน้าแจ้งเตือนระบบยังไม่เปิด'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 print:hidden">
        <button
          onClick={() => setActiveTab("builder")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "builder" 
              ? "border-blue-600 text-blue-600 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Edit3 className="w-4 h-4" />
          จัดการข้อคำถามและส่วนประเมิน ({dimensions.length} ส่วน / {totalItemsCount} ข้อ)
        </button>

        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "overview" 
              ? "border-blue-600 text-blue-600 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          กราฟและสถิติภาพรวม
        </button>

        <button
          onClick={() => setActiveTab("items")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "items" 
              ? "border-blue-600 text-blue-600 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          ตารางวิเคราะห์รายข้อ (Item Analysis)
        </button>

        <button
          onClick={() => setActiveTab("suggestions")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "suggestions" 
              ? "border-blue-600 text-blue-600 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          ข้อเสนอแนะ ({analytics?.suggestions?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("respondents")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "respondents" 
              ? "border-blue-600 text-blue-600 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          ผู้ตอบแบบประเมินแล้ว ({analytics?.respondentsList?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "pending" 
              ? "border-amber-500 text-amber-600 dark:text-amber-400" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserX className="w-4 h-4" />
          ยังไม่ประเมิน ({totalPending})
          {totalPending > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {totalPending}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: FORM BUILDER (จัดการส่วนและรายการประเมินเอง) */}
      {/* ==================================================== */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                กำหนดส่วนและรายการประเมินความพึงพอใจ
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                ท่านสามารถเพิ่ม ลบ หรือแก้ไขชื่อส่วน (Dimensions) และข้อคำถาม (Items) ได้ตามต้องการ
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLoadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-sm transition-all"
                title="โหลดชุดคำถามมาตรฐาน 4 ด้านเป็นตัวอย่าง"
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                โหลดตัวอย่าง 4 ด้าน
              </button>

              <button
                type="button"
                onClick={() => setIsAddingSection(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold transition-all"
              >
                <Plus className="w-4 h-4" />
                เพิ่มส่วนใหม่
              </button>

              <button
                type="button"
                onClick={handleSaveFormStructure}
                disabled={savingForm}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
              >
                {savingForm ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกโครงสร้างแบบประเมิน
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div 
              role="status"
              aria-live="polite"
              className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 p-4 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in duration-300"
            >
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="font-semibold">{saveSuccessMsg}</span>
            </div>
          )}

          {/* Form Title & Description Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">หัวข้อและคำชี้แจงแบบประเมิน</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="survey-title-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  ชื่อแบบประเมิน (Title)
                </label>
                <input
                  id="survey-title-input"
                  type="text"
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  aria-label="ชื่อแบบประเมิน"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="survey-desc-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  คำชี้แจงสำหรับผู้เรียน (Description)
                </label>
                <textarea
                  id="survey-desc-input"
                  rows={2}
                  value={surveyDescription}
                  onChange={(e) => setSurveyDescription(e.target.value)}
                  aria-label="คำชี้แจงสำหรับผู้เรียน"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Add Section Modal / Inline Form */}
          {isAddingSection && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800/50 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-blue-900 dark:text-blue-300 text-base flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-blue-600" />
                  เพิ่มส่วนการประเมินใหม่ (Section / Dimension)
                </h3>
                <button 
                  onClick={() => setIsAddingSection(false)}
                  aria-label="ยกเลิกการเพิ่มส่วนใหม่"
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ยกเลิก
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-section-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อส่วน/ด้าน (เช่น ด้านที่ 1: ด้านเนื้อหาบทเรียน) *
                  </label>
                  <input
                    id="new-section-title"
                    type="text"
                    placeholder="กรอกชื่อส่วนการประเมิน..."
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    aria-label="ชื่อส่วนการประเมินใหม่"
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="new-section-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    คำอธิบายย่อย (ถ้ามี)
                  </label>
                  <input
                    id="new-section-desc"
                    type="text"
                    placeholder="เช่น ความครอบคลุมและความเข้าใจง่ายของเนื้อหา"
                    value={newSectionDesc}
                    onChange={(e) => setNewSectionDesc(e.target.value)}
                    aria-label="คำอธิบายย่อยของส่วนการประเมินใหม่"
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSection(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                >
                  เพิ่มส่วนนี้
                </button>
              </div>
            </div>
          )}

          {/* List of Sections / Dimensions */}
          {dimensions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">ยังไม่มีส่วนการประเมินในระบบ</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                  คลิกปุ่ม &ldquo;เพิ่มส่วนใหม่&rdquo; เพื่อเริ่มกำหนดหัวข้อและข้อคำถาม หรือคลิก &ldquo;โหลดตัวอย่าง 4 ด้าน&rdquo; เพื่อใช้แม่แบบมาตรฐาน
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSection(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  + เพิ่มส่วนการประเมินแรก
                </button>
                <button
                  type="button"
                  onClick={handleLoadTemplate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-purple-200 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-bold transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  โหลดแม่แบบตัวอย่าง 4 ด้าน
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {dimensions.map((dim, dimIdx) => (
                <div 
                  key={dim.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
                >
                  {/* Section Title Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {dimIdx + 1}
                      </span>
                      <div>
                        <input
                          type="text"
                          value={dim.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDimensions(prev => prev.map(d => d.id === dim.id ? { ...d, title: val } : d));
                          }}
                          aria-label={`แก้ไขชื่อส่วนการประเมินที่ ${dimIdx + 1}`}
                          className="font-bold text-slate-800 dark:text-white text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                        />
                        <input
                          type="text"
                          value={dim.description || ""}
                          placeholder="คำอธิบายย่อย..."
                          onChange={(e) => {
                            const val = e.target.value;
                            setDimensions(prev => prev.map(d => d.id === dim.id ? { ...d, description: val } : d));
                          }}
                          aria-label={`แก้ไขคำอธิบายย่อยของส่วนที่ ${dimIdx + 1}`}
                          className="block text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 mt-0.5"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingItemToDimId(dim.id);
                          setNewItemText("");
                        }}
                        aria-label={`เพิ่มข้อคำถามในส่วนที่ ${dimIdx + 1}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มข้อคำถาม
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSection(dim.id)}
                        aria-label={`ลบส่วนการประเมินที่ ${dimIdx + 1}`}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="ลบส่วนนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Add Item Form */}
                  {addingItemToDimId === dim.id && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                      <label htmlFor={`new-item-input-${dim.id}`} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ข้อความรายการประเมิน (Question Item) *
                      </label>
                      <input
                        id={`new-item-input-${dim.id}`}
                        type="text"
                        autoFocus
                        placeholder={`เช่น ${dimIdx + 1}.${dim.items.length + 1} เนื้อหามีความชัดเจนและเข้าใจง่าย`}
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem(dim.id);
                          }
                        }}
                        aria-label="ข้อความรายการประเมินใหม่"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAddingItemToDimId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-200/50"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddItem(dim.id)}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                        >
                          เพิ่มข้อนี้
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  {dim.items.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                      ยังไม่มีข้อคำถามในส่วนนี้ คลิก &ldquo;+ เพิ่มข้อคำถาม&rdquo; เพื่อเพิ่ม
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dim.items.map((item, itemIdx) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-slate-100 dark:border-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 flex-1">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {itemIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => handleUpdateItemText(dim.id, item.id, e.target.value)}
                              aria-label={`แก้ไขข้อความรายการประเมินที่ ${itemIdx + 1}`}
                              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-0.5"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(dim.id, item.id)}
                            aria-label={`ลบข้อคำถามที่ ${itemIdx + 1}`}
                            className="p-1 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                            title="ลบข้อนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSaveFormStructure}
              disabled={savingForm}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition-all"
            >
              {savingForm ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึกโครงสร้างแบบประเมิน
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: OVERVIEW & INTERACTIVE CHARTS */}
      {/* ==================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Charts Component */}
          <SatisfactionCharts analytics={analytics} dimensions={currentDimensions} />

          {/* 4 Dimension Summary Cards */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              สรุปผลการประเมินแยกตามส่วน/ด้าน ({currentDimensions.length} ด้าน)
            </h2>

            {currentDimensions.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border rounded-3xl text-slate-400">
                ยังไม่ได้กำหนดส่วนการประเมิน กรุณาไปที่แท็บ &ldquo;จัดการข้อคำถามและส่วนประเมิน&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentDimensions.map((dim: any, idx: number) => {
                  const stat = analytics?.dimensionStats?.[dim.id] || { mean: 0, sd: 0, quality: 'ยังไม่มีข้อมูล', qualityColor: 'text-slate-500 bg-slate-100' };
                  return (
                    <div 
                      key={dim.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">ส่วนที่ {idx + 1}</span>
                          <h3 className="font-bold text-slate-800 dark:text-white text-base">
                            {dim.title}
                          </h3>
                          {dim.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{dim.description}</p>
                          )}
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${stat.qualityColor}`}>
                          {stat.quality}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-800 dark:text-white">
                            {stat.mean > 0 ? stat.mean.toFixed(2) : '-'}
                          </span>
                          <span className="text-xs text-slate-400">/ 5.00 คะแนน</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          S.D. = {stat.sd > 0 ? stat.sd.toFixed(2) : '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: ITEM BREAKDOWN TABLE */}
      {/* ==================================================== */}
      {(activeTab === "items" || typeof window === "undefined") && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              ตารางวิเคราะห์ผลการประเมินความพึงพอใจรายข้อ (Item Analysis)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เกณฑ์การแปลผล: 4.50–5.00 มากที่สุด | 3.50–4.49 มาก | 2.50–3.49 ปานกลาง | 1.50–2.49 น้อย | 1.00–1.49 น้อยที่สุด
            </p>
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">ข้อคำถามการประเมิน</th>
                  <th className="px-6 py-4 text-center w-28">ค่าเฉลี่ย (x̄)</th>
                  <th className="px-6 py-4 text-center w-24">S.D.</th>
                  <th className="px-6 py-4 text-center w-32">ระดับความพึงพอใจ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {currentDimensions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      ยังไม่มีส่วนและข้อคำถามการประเมินในระบบ
                    </td>
                  </tr>
                ) : (
                  currentDimensions.map((dim: any, dimIdx: number) => {
                    const dimStat = analytics?.dimensionStats?.[dim.id] || { mean: 0, sd: 0, quality: '-', qualityColor: 'text-slate-500' };
                    return (
                      <div key={dim.id} className="contents">
                        {/* Dimension Header Row */}
                        <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-bold text-slate-800 dark:text-white">
                          <td className="px-6 py-3" colSpan={4}>
                            <span className="text-blue-600 dark:text-blue-400 mr-2">{dim.title}</span>
                            {dim.description && (
                              <span className="text-xs text-slate-500 font-normal">({dim.description})</span>
                            )}
                          </td>
                        </tr>

                        {/* Items Rows */}
                        {(dim.items || []).map((item: any) => {
                          const itemStat = analytics?.itemStats?.[item.id] || { mean: 0, sd: 0, quality: 'ยังไม่มีข้อมูล', qualityColor: 'text-slate-500 bg-slate-100' };
                          return (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300 pl-8">
                                {item.text}
                              </td>
                              <td className="px-6 py-3.5 text-center font-bold text-slate-800 dark:text-white">
                                {itemStat.mean > 0 ? itemStat.mean.toFixed(2) : '-'}
                              </td>
                              <td className="px-6 py-3.5 text-center font-mono text-slate-500 dark:text-slate-400">
                                {itemStat.sd > 0 ? itemStat.sd.toFixed(2) : '-'}
                              </td>
                              <td className="px-6 py-3.5 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${itemStat.qualityColor}`}>
                                  {itemStat.quality}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Dimension Subtotal Row */}
                        <tr className="bg-slate-50/70 dark:bg-slate-800/40 font-bold text-slate-800 dark:text-white border-b-2 border-slate-200 dark:border-slate-700">
                          <td className="px-6 py-3 text-right text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            เฉลี่ยรวม {dim.title}
                          </td>
                          <td className="px-6 py-3 text-center text-blue-600 dark:text-blue-400 font-extrabold">
                            {dimStat.mean > 0 ? dimStat.mean.toFixed(2) : '-'}
                          </td>
                          <td className="px-6 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                            {dimStat.sd > 0 ? dimStat.sd.toFixed(2) : '-'}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${dimStat.qualityColor}`}>
                              {dimStat.quality}
                            </span>
                          </td>
                        </tr>
                      </div>
                    );
                  })
                )}

                {/* Grand Total Row */}
                <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-base">
                  <td className="px-6 py-4">
                    คะแนนเฉลี่ยรวมทุกด้าน (Overall Total)
                  </td>
                  <td className="px-6 py-4 text-center text-lg text-amber-300">
                    {overallMean > 0 ? overallMean.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-blue-100">
                    {overallSD > 0 ? overallSD.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-blue-700 shadow-sm">
                      {overallQuality}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (< md) */}
          <div className="block md:hidden p-4 space-y-4">
            {currentDimensions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                ยังไม่มีส่วนและข้อคำถามการประเมินในระบบ
              </div>
            ) : (
              currentDimensions.map((dim: any, dimIdx: number) => {
                const dimStat = analytics?.dimensionStats?.[dim.id] || { mean: 0, sd: 0, quality: '-', qualityColor: 'text-slate-500' };
                return (
                  <div key={dim.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3.5 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">ด้านที่ {dimIdx + 1}</span>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-0.5">{dim.title}</h3>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
                      {(dim.items || []).map((item: any, iIdx: number) => {
                        const itemStat = analytics?.itemStats?.[item.id] || { mean: 0, sd: 0, quality: 'ยังไม่มีข้อมูล', qualityColor: 'text-slate-500 bg-slate-100' };
                        return (
                          <div key={item.id} className="p-3 space-y-2">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.text}</p>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-white">x̄ = {itemStat.mean > 0 ? itemStat.mean.toFixed(2) : '-'}</span>
                                <span className="text-slate-400 font-mono">S.D. = {itemStat.sd > 0 ? itemStat.sd.toFixed(2) : '-'}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${itemStat.qualityColor}`}>
                                {itemStat.quality}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-300">เฉลี่ยรวมด้านนี้</span>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400">x̄ = {dimStat.mean > 0 ? dimStat.mean.toFixed(2) : '-'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${dimStat.qualityColor}`}>{dimStat.quality}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Mobile Grand Total Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 shadow-md space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">คะแนนเฉลี่ยรวมทุกด้าน</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-blue-700">{overallQuality}</span>
              </div>
              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-2xl font-black text-amber-300">{overallMean > 0 ? overallMean.toFixed(2) : '-'}</span>
                <span className="text-xs text-blue-100">/ 5.00 คะแนน</span>
                <span className="text-xs text-blue-200 font-mono ml-auto">S.D. = {overallSD > 0 ? overallSD.toFixed(2) : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: SUGGESTIONS LIST */}
      {/* ==================================================== */}
      {activeTab === "suggestions" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            ข้อเสนอแนะและข้อคิดเห็นเพิ่มเติมจากนักเรียน ({analytics?.suggestions?.length || 0} รายการ)
          </h2>

          {analytics?.suggestions?.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              ยังไม่มีข้อเสนอแนะเพิ่มเติมจากผู้เรียน
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {analytics?.suggestions?.map((item: any, i: number) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 space-y-1.5">
                  <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                    &ldquo;{item.text}&rdquo;
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">{item.name}</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: RESPONDENTS LIST */}
      {/* ==================================================== */}
      {activeTab === "respondents" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-0">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                รายชื่อผู้ตอบแบบประเมินความพึงพอใจ ({analytics?.respondentsList?.length || 0} คน)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                รายชื่อนักเรียนที่ส่งแบบประเมินเรียบร้อยแล้ว พร้อมคะแนนเฉลี่ยและระดับคุณภาพ
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors self-start sm:self-auto shadow-xs"
            >
              <UserX className="w-4 h-4" />
              ดูรายชื่อที่ยังไม่ประเมิน ({totalPending} คน)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4">อีเมล</th>
                  <th className="px-6 py-4 text-center">คะแนนเฉลี่ยที่ประเมิน</th>
                  <th className="px-6 py-4 text-center">ระดับคุณภาพ</th>
                  <th className="px-6 py-4">วันที่ทำแบบประเมิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {analytics?.respondentsList?.map((resp: any) => (
                  <tr key={resp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">
                      {resp.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {resp.email}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">
                      {Number(resp.score).toFixed(2)} / 5.00
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {resp.quality}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                      {resp.submittedAt}
                    </td>
                  </tr>
                ))}

                {analytics?.respondentsList?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      ยังไม่มีนักเรียนส่งแบบประเมิน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: PENDING STUDENTS LIST (ยังไม่ประเมิน) */}
      {/* ==================================================== */}
      {activeTab === "pending" && (
        <div className="space-y-6">
          {/* Header & Quick Action Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <UserX className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                    รายชื่อนักเรียนที่ยังไม่ประเมินความพึงพอใจ
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {totalPending} คน
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  รายชื่อนักเรียนในระบบที่ยังไม่ได้ทำแบบประเมินความพึงพอใจ เพื่อให้ครูผู้สอนติดตามและนำอีเมลไปแจ้งเตือนได้อย่างสะดวก
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("respondents")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  <Users className="w-4 h-4 text-blue-500" />
                  ดูผู้ตอบแล้ว ({totalRespondents} คน)
                </button>
              </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">นักเรียนทั้งหมด</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalStudents} <span className="text-xs font-normal text-slate-400">คน</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">ประเมินแล้ว</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {totalRespondents} <span className="text-xs font-normal text-emerald-600/70">คน ({responseRate}%)</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">ยังไม่ประเมิน</p>
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {totalPending} <span className="text-xs font-normal text-amber-600/70">คน ({totalStudents > 0 ? Math.round((totalPending / totalStudents) * 100) : 0}%)</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  <UserX className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัสนักเรียน, อีเมล..."
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={pendingSort}
                  onChange={(e: any) => setPendingSort(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="id_asc">เรียงตามรหัส: น้อยไปมาก</option>
                  <option value="id_desc">เรียงตามรหัส: มากไปน้อย</option>
                  <option value="name_asc">เรียงตามชื่อ: ก - ฮ (A - Z)</option>
                  <option value="name_desc">เรียงตามชื่อ: ฮ - ก (Z - A)</option>
                </select>

                <button
                  type="button"
                  onClick={handleCopyEmails}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
                  title="คัดลอกอีเมลของนักเรียนที่ยังไม่ประเมินทั้งหมด สำหรับนำไปวางในช่องส่งเมล"
                >
                  {copiedEmails ? <CheckCheck className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  {copiedEmails ? "คัดลอกอีเมลแล้ว!" : "คัดลอกอีเมลทั้งหมด"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyList}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs transition-colors"
                  title="คัดลอกรายชื่อและรหัสนักเรียนทั้งหมดเป็นข้อความ"
                >
                  {copiedList ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  {copiedList ? "คัดลอกรายชื่อแล้ว!" : "คัดลอกรายชื่อ"}
                </button>
              </div>
            </div>
          </div>

          {/* Pending Students Data View */}
          {totalPending === 0 ? (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/50 rounded-3xl p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300">
                นักเรียนทุกคนทำแบบประเมินความพึงพอใจครบถ้วนแล้ว! 🎉
              </h3>
              <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 max-w-md mx-auto">
                ผู้เรียนทั้งหมด {totalStudents} คน ได้ส่งแบบประเมินความพึงพอใจครบ 100% เรียบร้อยแล้ว ไม่มีนักเรียนค้างการประเมิน
              </p>
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-sm">
              ไม่พบนักเรียนที่ตรงกับคำค้นหา &ldquo;{pendingSearch}&rdquo;
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4 w-16 text-center">ลำดับ</th>
                      <th className="px-6 py-4 w-36">รหัสประจำตัว</th>
                      <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                      <th className="px-6 py-4">อีเมล</th>
                      <th className="px-6 py-4 text-center w-40">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                    {filteredPending.map((student: any, idx: number) => (
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-center text-xs font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {student.studentIdNum || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                              {student.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                (student.name || "U").charAt(0)
                              )}
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-white">
                              {student.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            ยังไม่ทำแบบประเมิน
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (< md) */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPending.map((student: any, idx: number) => (
                  <div key={student.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                          {student.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            (student.name || "U").charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">
                            {idx + 1}. {student.name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            รหัส: {student.studentIdNum || "-"}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                        ยังไม่ประเมิน
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                      {student.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
