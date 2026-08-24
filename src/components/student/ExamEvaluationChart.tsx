"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ExamEvaluationChartProps {
  data: { name: string; score: number; fullScore: number; fill: string }[];
}

export default function ExamEvaluationChart({ data }: ExamEvaluationChartProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-64 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>;

  const isDark = theme === 'dark';

  // Compute the max Y axis value from actual data (not hardcoded)
  const maxFullScore = Math.max(...data.map(d => d.fullScore), 1);

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 14, fontWeight: 500 }}
            dy={10}
          />
          <YAxis 
            domain={[0, maxFullScore]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
          />
          <Tooltip 
            cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9' }}
            contentStyle={{ 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
            formatter={(value: any, _name: any, props: any) => {
              const fullScore = props.payload?.fullScore ?? maxFullScore;
              return [`${value}/${fullScore} คะแนน`, 'ผลสอบ'];
            }}
          />
          <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={60}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
