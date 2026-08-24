"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine
} from "recharts";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { BarChart3, PieChart as PieIcon, Activity } from "lucide-react";

interface SatisfactionChartsProps {
  analytics: {
    overallMean: number;
    overallSD: number;
    dimensionStats: Record<string, { mean: number; sd: number; quality: string }>;
    itemStats: Record<string, { mean: number; sd: number; quality: string }>;
    totalRespondents: number;
  };
  dimensions: Array<{ id: string; title: string; items: Array<{ id: string; text: string }> }>;
}

const COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#10B981', '#EC4899'];
const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'];

export default function SatisfactionCharts({ analytics, dimensions }: SatisfactionChartsProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "radar" | "distribution">("bar");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-80 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>;
  }

  const isDark = theme === "dark";
  const safeDimensions = Array.isArray(dimensions) ? dimensions : [];
  const hasData = (analytics?.totalRespondents || 0) > 0 && safeDimensions.length > 0;

  // 1. Data for Dimension Comparison (Bar / Radar)
  const dimensionData = safeDimensions.map((dim, index) => {
    const stat = analytics?.dimensionStats?.[dim.id] || { mean: 0, sd: 0, quality: '-' };
    // Short title for chart
    let shortName = dim.title.replace(/^\d+\.\s*/, '');
    if (shortName.length > 18) shortName = shortName.substring(0, 16) + '...';

    return {
      id: dim.id,
      fullName: dim.title,
      name: `ด้านที่ ${index + 1}`,
      shortName,
      mean: stat.mean,
      sd: stat.sd,
      quality: stat.quality,
      fill: COLORS[index % COLORS.length]
    };
  });

  // 2. Data for Rating Level Distribution (Estimated from all item evaluations)
  // Let's compute counts of 5s, 4s, 3s, 2s, 1s from item means
  const distributionMap = { "มากที่สุด (5)": 0, "มาก (4)": 0, "ปานกลาง (3)": 0, "น้อย (2)": 0, "น้อยที่สุด (1)": 0 };
  
  if (hasData && analytics.itemStats) {
    Object.values(analytics.itemStats).forEach(st => {
      if (st.mean >= 4.5) distributionMap["มากที่สุด (5)"] += 1;
      else if (st.mean >= 3.5) distributionMap["มาก (4)"] += 1;
      else if (st.mean >= 2.5) distributionMap["ปานกลาง (3)"] += 1;
      else if (st.mean >= 1.5) distributionMap["น้อย (2)"] += 1;
      else if (st.mean > 0) distributionMap["น้อยที่สุด (1)"] += 1;
    });
  }

  const distributionData = Object.entries(distributionMap)
    .filter(([_, value]) => value > 0 || !hasData)
    .map(([name, value], i) => ({
      name,
      value: hasData ? value : (i === 0 ? 8 : i === 1 ? 5 : 2),
      color: PIE_COLORS[i % PIE_COLORS.length]
    }));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header & Chart View Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            กราฟวิเคราะห์ผลการประเมินความพึงพอใจ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            แสดงการเปรียบเทียบคะแนนเฉลี่ยแต่ละด้านและสัดส่วนระดับความพึงพอใจ
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setChartType("bar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chartType === "bar" 
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            กราฟแท่ง (Bar)
          </button>
          <button
            onClick={() => setChartType("radar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chartType === "radar" 
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            กราฟเรดาร์ (Radar)
          </button>
          <button
            onClick={() => setChartType("distribution")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chartType === "distribution" 
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            สัดส่วนระดับ (Donut)
          </button>
        </div>
      </div>

      {/* Chart Display Area */}
      {!hasData ? (
        <div className="h-72 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3 animate-pulse" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">ยังไม่มีข้อมูลการประเมินจากนักเรียน</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            เมื่อครูเปิดระบบและนักเรียนส่งแบบประเมิน กราฟจะประมวลผลคะแนนเฉลี่ยแต่ละด้านและสัดส่วนระดับคะแนนแบบ Real-time ทันที
          </p>
        </div>
      ) : (
        <div className="w-full">
          {/* 1. BAR CHART VIEW */}
          {chartType === "bar" && (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dimensionData}
                  margin={{ top: 20, right: 30, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis 
                    dataKey="shortName" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  />
                  <ReferenceLine 
                    y={4.5} 
                    stroke="#10B981" 
                    strokeDasharray="4 4" 
                    label={{ value: 'เกณฑ์มากที่สุด (4.50)', fill: '#10B981', fontSize: 11, position: 'top' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderRadius: '16px',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      padding: '12px 16px'
                    }}
                    formatter={(value: any, _name: any, props: any) => {
                      const item = props.payload;
                      return [
                        <div key="val" className="space-y-1">
                          <p className="font-bold text-base text-blue-600 dark:text-blue-400">
                            {Number(value).toFixed(2)} / 5.00 คะแนน
                          </p>
                          <p className="text-xs text-slate-500">S.D. = {item.sd.toFixed(2)} ({item.quality})</p>
                        </div>,
                        'คะแนนเฉลี่ย'
                      ];
                    }}
                    labelFormatter={(_label, payload) => {
                      return payload?.[0]?.payload?.fullName || '';
                    }}
                  />
                  <Bar dataKey="mean" radius={[12, 12, 0, 0]} maxBarSize={64}>
                    {dimensionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 2. RADAR CHART VIEW */}
          {chartType === "radar" && (
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={dimensionData}>
                  <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <PolarAngleAxis 
                    dataKey="shortName" 
                    tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 600 }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 5]} 
                    tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }} 
                  />
                  <Radar 
                    name="คะแนนเฉลี่ย (x̄)" 
                    dataKey="mean" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.45} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                    formatter={(val: any) => [`${Number(val).toFixed(2)} / 5.00 คะแนน`, 'คะแนนเฉลี่ย']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 3. DONUT / PIE CHART VIEW */}
          {chartType === "distribution" && (
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                    formatter={(val: any) => [`${val} ข้อคำถาม`, 'จำนวน']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Dimension Quick Legend Pill Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {dimensionData.map((dim, i) => (
          <div 
            key={dim.id}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60"
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dim.fill }}></div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{dim.name}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                x̄ = {dim.mean > 0 ? dim.mean.toFixed(2) : '-'} ({dim.quality})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
