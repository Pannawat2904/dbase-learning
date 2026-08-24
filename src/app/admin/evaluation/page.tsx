"use client";

import { useState, useEffect } from "react";
import { 
  Star, 
  Lock, 
  Unlock, 
  Users, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  MessageSquare, 
  Sparkles, 
  RefreshCw,
  Sliders,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";
import AutoRefresh from "@/components/admin/AutoRefresh";
import SatisfactionCharts from "@/components/admin/SatisfactionCharts";
import surveyData from "@/data/satisfaction-survey.json";

export default function AdminEvaluationPage() {
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "items" | "suggestions" | "respondents">("overview");

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/survey?mode=analytics', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch survey analytics');
      const data = await res.json();
      setAnalytics(data);
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
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    } finally {
      setToggling(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
  const responseRate = analytics?.responseRate || 0;
  const overallMean = analytics?.overallMean || 0;
  const overallSD = analytics?.overallSD || 0;
  const overallQuality = analytics?.overallQuality || "ยังไม่มีข้อมูล";
  const overallQualityColor = analytics?.overallQualityColor || "text-slate-600 bg-slate-100";

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
            ควบคุมการเปิด-ปิดแบบประเมินสำหรับนักเรียน และดูรายงานสถิติวิจัยแบบ Real-time
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงานสรุปผล
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

      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-xl font-bold">รายงานผลการประเมินความพึงพอใจต่อการใช้งานระบบ DBASE Learning AI</h1>
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
          </div>
        </div>

        {/* Card 3: Feedback Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {analytics?.suggestions?.length || 0} <span className="text-sm font-normal text-slate-400">ข้อความ</span>
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">ข้อเสนอแนะเพิ่มเติม</p>
            <p className="text-xs text-slate-400 mt-0.5">จากนักเรียนที่ตอบแบบประเมิน</p>
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

      {/* Interactive Charts & Graphs Section */}
      <SatisfactionCharts analytics={analytics} dimensions={surveyData.dimensions} />

      {/* 4 Dimension Summary Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          สรุปผลการประเมินแยกตามด้าน (4 ด้านหลัก)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surveyData.dimensions.map((dim, idx) => {
            const stat = analytics?.dimensionStats?.[dim.id] || { mean: 0, sd: 0, quality: 'ยังไม่มีข้อมูล', qualityColor: 'text-slate-500 bg-slate-100' };
            return (
              <div 
                key={dim.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">ด้านที่ {idx + 1}</span>
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">
                      {dim.title.replace(/^\d+\.\s*/, '')}
                    </h3>
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
      </div>

      {/* Tabs Navigation (Screen only) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 print:hidden">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "overview" 
              ? "border-blue-600 text-blue-600 dark:text-blue-400" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          ตารางวิเคราะห์รายข้อ (Item Breakdown)
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
          รายชื่อผู้ตอบแบบประเมิน ({analytics?.respondentsList?.length || 0})
        </button>
      </div>

      {/* TAB 1: Item Breakdown Table */}
      {(activeTab === "overview" || typeof window === "undefined") && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              ตารางวิเคราะห์ผลการประเมินความพึงพอใจรายข้อ (Item Analysis)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เกณฑ์การแปลผล: 4.50–5.00 มากที่สุด | 3.50–4.49 มาก | 2.50–3.49 ปานกลาง | 1.50–2.49 น้อย | 1.00–1.49 น้อยที่สุด
            </p>
          </div>

          <div className="overflow-x-auto">
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
                {surveyData.dimensions.map((dim, dimIdx) => {
                  const dimStat = analytics?.dimensionStats?.[dim.id] || { mean: 0, sd: 0, quality: '-', qualityColor: 'text-slate-500' };
                  return (
                    <div key={dim.id} className="contents">
                      {/* Dimension Header Row */}
                      <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-bold text-slate-800 dark:text-white">
                        <td className="px-6 py-3" colSpan={4}>
                          <span className="text-blue-600 dark:text-blue-400 mr-2">{dim.title}</span>
                          <span className="text-xs text-slate-500 font-normal">({dim.description})</span>
                        </td>
                      </tr>

                      {/* Items Rows */}
                      {dim.items.map((item) => {
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
                })}

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
        </div>
      )}

      {/* TAB 2: Suggestions List */}
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

      {/* TAB 3: Respondents List */}
      {activeTab === "respondents" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              รายชื่อผู้ตอบแบบประเมินความพึงพอใจ ({analytics?.respondentsList?.length || 0} คน)
            </h2>
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
    </div>
  );
}
