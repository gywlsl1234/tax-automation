import { COLORS } from "./colors";

interface KpiCardProps {
  label: string;
  value: number;
  unit?: string;
  compareValue?: number | null;
  compareLabel?: string;
  accentColor?: string;
}

export function KpiCard({
  label,
  value,
  unit = "원",
  compareValue,
  compareLabel = "전년",
  accentColor = COLORS.profit,
}: KpiCardProps) {
  const diff = compareValue !== undefined && compareValue !== null ? value - compareValue : null;

  return (
    <div
      style={{
        border: `1px solid ${COLORS.gridline}`,
        borderTop: `3px solid ${accentColor}`,
        borderRadius: 8,
        padding: "14px 16px",
        minWidth: 160,
      }}
    >
      <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: "4px 0" }}>
        {value.toLocaleString("ko-KR")}
        <span style={{ fontSize: 13, fontWeight: 400 }}>{unit}</span>
      </p>
      {diff !== null && (
        <p style={{ fontSize: 12, color: diff >= 0 ? COLORS.good : COLORS.critical, margin: 0 }}>
          {compareLabel} 대비 {diff >= 0 ? "+" : ""}
          {diff.toLocaleString("ko-KR")}
          {unit}
        </p>
      )}
    </div>
  );
}
