"use client";

import { useState, useMemo } from "react";
import { 
  ShieldAlert, 
  Users, 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  FileText, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  Flame
} from "lucide-react";
import { ExamViolationRecord, VIOLATION_TYPE_CONFIG, ViolationType } from "@/utils/exam-integrity";
import AutoRefresh from "./AutoRefresh";

interface ExamIntegrityViewerProps {
  initialViolations: ExamViolationRecord[];
}

export default function ExamIntegrityViewer({ initialViolations }: ExamIntegrityViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [selectedStudentForTimeline, setSelectedStudentForTimeline] = useState<string | null>(null);

  // Extract unique courses for filter
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    initialViolations.forEach(v => {
      if (v.courseId) map.set(v.courseId, v.courseTitle || `รายวิชา #${v.courseId}`);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [initialViolations]);

  // Compute grouped violations for highlighting students with > 3 violations in single exam attempt
  const sessionViolationCounts = useMemo(() => {
    const counts = new Map<string, number>(); // key: studentId_lessonId_attemptNumber
    initialViolations.forEach(v => {
      const key = `${v.studentId}_${v.lessonId}_${v.attemptNumber}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [initialViolations]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = initialViolations.length;
    const uniqueStudents = new Set(initialViolations.map(v => v.studentId)).size;
    
    // Type frequency
    const typeCount: Record<string, number> = {};
    initialViolations.forEach(v => {
      typeCount[v.violationType] = (typeCount[v.violationType] || 0) + 1;
    });

    let mostFrequentType: { type: ViolationType | string; count: number } = { type: '-', count: 0 };
    Object.entries(typeCount).forEach(([type, count]) => {
      if (count > mostFrequentType.count) {
        mostFrequentType = { type, count };
      }
    });

    // High risk count (>3 violations in single attempt)
    const highRiskSessions = Array.from(sessionViolationCounts.values()).filter(c => c > 3).length;

    return {
      total,
      uniqueStudents,
      mostFrequentType: mostFrequentType.count > 0 ? (VIOLATION_TYPE_CONFIG[mostFrequentType.type as ViolationType]?.label || mostFrequentType.type) : "ยังไม่มีข้อมูล",
      mostFrequentCount: mostFrequentType.count,
      highRiskSessions
    };
  }, [initialViolations, sessionViolationCounts]);

  // Filtered list
  const filteredViolations = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return initialViolations.filter(v => {
      // Search filter
      const matchesSearch = 
        searchTerm.trim() === "" ||
        v.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.lessonTitle && v.lessonTitle.toLowerCase().includes(searchTerm.toLowerCase()));

      // Course filter
      const matchesCourse = selectedCourse === "all" || v.courseId === selectedCourse;

      // Type filter
      const matchesType = selectedType === "all" || v.violationType === selectedType;

      // Date range filter
      let matchesDate = true;
      if (selectedDateRange === "today") {
        matchesDate = v.rawTimestamp.startsWith(todayStr);
      } else if (selectedDateRange === "7days") {
        matchesDate = new Date(v.rawTimestamp) >= sevenDaysAgo;
      }

      return matchesSearch && matchesCourse && matchesType && matchesDate;
    });
  }, [initialViolations, searchTerm, selectedCourse, selectedType, selectedDateRange]);

  // Selected student timeline data
  const studentTimelineData = useMemo(() => {
    if (!selectedStudentForTimeline) return null;
    const records = initialViolations.filter(v => v.studentId === selectedStudentForTimeline);
    if (records.length === 0) return null;

    const studentInfo = {
      name: records[0].studentName,
      email: records[0].studentEmail,
      avatar: records[0].studentAvatar
    };

    // Group by lesson + attempt
    const groups = new Map<string, { courseTitle: string; lessonTitle: string; attempt: number; items: ExamViolationRecord[] }>();
    records.forEach(r => {
      const gKey = `${r.lessonId}_${r.attemptNumber}`;
      if (!groups.has(gKey)) {
        groups.set(gKey, {
          courseTitle: r.courseTitle || "-",
          lessonTitle: r.lessonTitle || "-",
          attempt: r.attemptNumber,
          items: []
        });
      }
      groups.get(gKey)!.items.push(r);
    });

    return {
      studentInfo,
      totalCount: records.length,
      groups: Array.from(groups.values())
    };
  }, [selectedStudentForTimeline, initialViolations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <AutoRefresh interval={5000} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> Exam Integrity Monitoring
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            การทุจริตระหว่างสอบ (Exam Integrity)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            ตรวจจับและบันทึกพฤติกรรมต้องสงสัยระหว่างทำแบบทดสอบ เช่น สลับหน้าจอ, พยายามคัดลอก, คลิกขวา, ออกนอกเบราว์เซอร์ แบบ Real-time
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* 1. Total Violations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              ทั้งหมด
            </span>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">{stats.total}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">รายการตรวจพบพฤติกรรม</p>
        </div>

        {/* 2. Unique Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              ผู้เรียน
            </span>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">{stats.uniqueStudents}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">นักเรียนที่มีพฤติกรรมต้องสงสัย</p>
        </div>

        {/* 3. Most Frequent Violation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            {stats.mostFrequentCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {stats.mostFrequentCount} ครั้ง
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 truncate" title={stats.mostFrequentType}>
            {stats.mostFrequentType}
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">ประเภทที่พบบ่อยที่สุด</p>
        </div>

        {/* 4. High Risk Sessions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl">
              <Flame className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
              เกิน 3 ครั้ง/รอบ
            </span>
          </div>
          <h3 className="text-3xl font-extrabold text-red-600 dark:text-red-400 mb-1">{stats.highRiskSessions}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">รอบสอบที่มีความเสี่ยงสูง</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, อีเมล, หรือชื่อข้อสอบ..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">ทุกรายวิชา ({courseOptions.length})</option>
              {courseOptions.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">ทุกประเภทพฤติกรรม</option>
              {Object.entries(VIOLATION_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">ทุกช่วงเวลา</option>
              <option value="today">เฉพาะวันนี้</option>
              <option value="7days">7 วันล่าสุด</option>
            </select>
          </div>
        </div>

        {/* Filter stats active */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>พบ {filteredViolations.length} รายการ จากทั้งหมด {initialViolations.length} รายการ</span>
          {(searchTerm || selectedCourse !== "all" || selectedType !== "all" || selectedDateRange !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCourse("all");
                setSelectedType("all");
                setSelectedDateRange("all");
              }}
              className="text-rose-600 dark:text-rose-400 hover:underline font-medium"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Main Violations Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            รายการตรวจพบพฤติกรรมล่าสุด (Latest Violations)
          </h2>
          <span className="text-xs text-slate-400">
            อัปเดตอัตโนมัติทุก 5 วินาที
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">นักเรียน</th>
                <th className="px-6 py-4">ประเภทพฤติกรรม</th>
                <th className="px-6 py-4">รายวิชา / แบบทดสอบ</th>
                <th className="px-6 py-4">ครั้งที่สอบ (Attempt)</th>
                <th className="px-6 py-4">เวลาที่ตรวจพบ</th>
                <th className="px-6 py-4 text-center">ระดับความเสี่ยง</th>
                <th className="px-6 py-4 text-right">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">ไม่พบรายการพฤติกรรมต้องสงสัย</p>
                    <p className="text-xs text-slate-400 mt-1">ยังไม่มีการตรวจพบการทุจริตระหว่างการสอบตามเงื่อนไขที่เลือก</p>
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v) => {
                  const cfg = VIOLATION_TYPE_CONFIG[v.violationType] || VIOLATION_TYPE_CONFIG.tab_switch;
                  const sessionKey = `${v.studentId}_${v.lessonId}_${v.attemptNumber}`;
                  const sessionTotal = sessionViolationCounts.get(sessionKey) || 1;
                  const isHighRisk = sessionTotal > 3;

                  return (
                    <tr 
                      key={v.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        isHighRisk ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                      }`}
                    >
                      {/* Student Info */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedStudentForTimeline(v.studentId)}
                          className="flex items-center gap-3 text-left group"
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isHighRisk ? 'bg-red-600 text-white shadow-sm shadow-red-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}>
                            {v.studentName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
                              <span>{v.studentName}</span>
                              {isHighRisk && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                                  {sessionTotal} ครั้ง!
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{v.studentEmail}</div>
                          </div>
                        </button>
                      </td>

                      {/* Violation Type Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Course / Lesson */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                          {v.lessonTitle}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                          {v.courseTitle}
                        </div>
                      </td>

                      {/* Attempt Number */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                          ครั้งที่ {v.attemptNumber}
                        </span>
                      </td>

                      {/* Detected Time */}
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {v.detectedAt}
                      </td>

                      {/* Risk Level */}
                      <td className="px-6 py-4 text-center">
                        {isHighRisk ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
                            <Flame className="w-3 h-3 text-red-600" /> เสี่ยงสูง (&gt;3 ครั้ง)
                          </span>
                        ) : sessionTotal > 1 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            เตือน ({sessionTotal} ครั้ง)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            ครั้งแรก
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedStudentForTimeline(v.studentId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                        >
                          <span>ดู Timeline</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Student Violation Timeline Modal */}
      {selectedStudentForTimeline && studentTimelineData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-rose-500/20">
                  {studentTimelineData.studentInfo.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {studentTimelineData.studentInfo.name}
                  </h3>
                  <p className="text-xs text-slate-400">{studentTimelineData.studentInfo.email}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedStudentForTimeline(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - Timeline */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>ประวัติการตรวจพบทั้งหมด: {studentTimelineData.totalCount} ครั้ง</span>
                <span>เรียงตามลำดับเวลา</span>
              </div>

              {studentTimelineData.groups.map((grp, gIdx) => {
                const isHighRiskGroup = grp.items.length > 3;

                return (
                  <div key={gIdx} className={`p-5 rounded-2xl border ${
                    isHighRiskGroup 
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/60' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs font-bold text-slate-400">{grp.courseTitle}</div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{grp.lessonTitle}</h4>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          สอบครั้งที่ {grp.attempt}
                        </span>
                        {isHighRiskGroup && (
                          <div className="text-[11px] font-bold text-red-600 mt-1">
                            ⚠️ เสี่ยงสูง ({grp.items.length} ครั้ง)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline Nodes */}
                    <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      {grp.items.map((it, idx) => {
                        const cfg = VIOLATION_TYPE_CONFIG[it.violationType] || VIOLATION_TYPE_CONFIG.tab_switch;
                        return (
                          <div key={it.id || idx} className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-2xl shadow-black/5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${it.violationType === 'tab_switch' ? 'bg-amber-500' : it.violationType === 'copy_attempt' ? 'bg-rose-500' : it.violationType === 'window_blur' ? 'bg-orange-500' : 'bg-purple-500'}`}></span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{cfg.label}</span>
                            </div>
                            <span className="text-slate-400 font-mono text-[11px]">{it.detectedAt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setSelectedStudentForTimeline(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
