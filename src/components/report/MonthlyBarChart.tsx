"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS } from "./colors";

interface MonthlyBarChartProps {
  title: string;
  monthly: number[]; // 12개월
  color: string;
  unit?: string;
}

function formatCompact(n: number) {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 10_000)}만`;
  return n.toLocaleString("ko-KR");
}

export function MonthlyBarChart({ title, monthly, color, unit = "원" }: MonthlyBarChartProps) {
  const data = monthly.map((value, idx) => ({ month: `${idx + 1}월`, value }));

  return (
    <div>
      <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridline} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={{ stroke: COLORS.gridline }} tickLine={false} />
          <YAxis
            tickFormatter={formatCompact}
            tick={{ fontSize: 11, fill: COLORS.muted }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString("ko-KR")}${unit}`, title]}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
