import type { Insight } from "@/lib/report/insights";
import { COLORS } from "./colors";

const ICON: Record<Insight["type"], string> = { good: "✓", warn: "!", info: "i" };
const COLOR: Record<Insight["type"], string> = { good: COLORS.good, warn: COLORS.critical, info: COLORS.profit };

export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div style={{ border: `1px solid ${COLORS.gridline}`, borderRadius: 8, padding: 16 }}>
      <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>한눈에 보는 핵심 포인트</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {insights.map((insight, idx) => (
          <li key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
            <span
              style={{
                flexShrink: 0,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: COLOR[insight.type],
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ICON[insight.type]}
            </span>
            <span style={{ color: COLORS.textPrimary }}>{insight.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
