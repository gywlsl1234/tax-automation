"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CompositionSlice } from "@/lib/report/aggregate";
import { COLORS } from "./colors";

interface CompositionDonutProps {
  title: string;
  data: CompositionSlice[];
}

export function CompositionDonut({ title, data }: CompositionDonutProps) {
  if (data.length === 0) {
    return (
      <div>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>{title}</p>
        <p style={{ fontSize: 13, color: COLORS.muted }}>데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>{title}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 140, height: 140, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={data.length > 1 ? 1 : 0}
                isAnimationActive={false}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS.categorical[idx % COLORS.categorical.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => Number(value).toLocaleString("ko-KR") + "원"} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12, flex: 1 }}>
          {data.map((slice, idx) => (
            <li key={slice.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: COLORS.categorical[idx % COLORS.categorical.length],
                  flexShrink: 0,
                }}
              />
              <span style={{ color: COLORS.textPrimary, flex: 1 }}>{slice.name}</span>
              <span style={{ color: COLORS.textSecondary }}>{Math.round(slice.ratio * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
