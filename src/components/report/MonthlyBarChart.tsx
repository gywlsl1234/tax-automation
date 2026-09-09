"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactWon } from "@/lib/report/money";
import { COLORS } from "./colors";

interface MonthlyBarChartProps {
  title: string;
  monthly: number[]; // 12개월
  color: string;
  unit?: string;
  /** 제공하면 이 달까지는 실적(진한 색), 이후는 예상(옅은 색)으로 구분해 그린다. */
  lastMonth?: number;
}

export function MonthlyBarChart({ title, monthly, color, unit = "원", lastMonth }: MonthlyBarChartProps) {
  const showProjectedSplit = lastMonth !== undefined && lastMonth > 0 && lastMonth < 12;
  const data = monthly.map((value, idx) => ({
    month: `${idx + 1}월`,
    value,
    isProjected: showProjectedSplit && idx + 1 > (lastMonth ?? 12),
  }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>{title}</p>
        {showProjectedSplit && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: COLORS.muted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
              실적
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.35, display: "inline-block" }}
              />
              예상
            </span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridline} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={{ stroke: COLORS.gridline }} tickLine={false} />
          <YAxis
            tickFormatter={formatCompactWon}
            tick={{ fontSize: 11, fill: COLORS.muted }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, _name, item) => [
              `${Number(value).toLocaleString("ko-KR")}${unit}${item?.payload?.isProjected ? " (예상)" : ""}`,
              title,
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {showProjectedSplit &&
              data.map((d, idx) => <Cell key={idx} fillOpacity={d.isProjected ? 0.35 : 1} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
