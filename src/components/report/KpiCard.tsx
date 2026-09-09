import { COLORS } from "./colors";

interface KpiCardProps {
  label: string;
  value: number | null;
  unit?: string;
  compareValue?: number | null;
  compareLabel?: string;
  accentColor?: string;
  /** 이 지표는 증가가 좋은 신호인지(up, 기본값) 나쁜 신호인지(down, 예: 매입액·비용류).
   * 색상 판단에만 쓰이고 화살표/부호 표시 방식은 바꾸지 않는다. */
  goodDirection?: "up" | "down";
  /** value가 null이면 "데이터 없음"으로 표시한다(0과 구분). */
  emptyText?: string;
}

export function KpiCard({
  label,
  value,
  unit = "원",
  compareValue,
  compareLabel = "전년",
  accentColor = COLORS.profit,
  goodDirection = "up",
  emptyText = "데이터 없음",
}: KpiCardProps) {
  const hasCompare = value !== null && compareValue !== undefined && compareValue !== null;
  const diff = hasCompare ? value - compareValue : null;
  const percent = hasCompare && compareValue !== 0 ? (diff! / Math.abs(compareValue)) * 100 : null;
  const isGoodChange = diff === null ? null : goodDirection === "up" ? diff >= 0 : diff <= 0;

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
      {value === null ? (
        <p style={{ fontSize: 14, color: COLORS.muted, margin: "8px 0" }}>{emptyText}</p>
      ) : (
        <>
          <p style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: "4px 0" }}>
            {value.toLocaleString("ko-KR")}
            <span style={{ fontSize: 13, fontWeight: 400 }}>{unit}</span>
          </p>
          {diff !== null && (
            <p style={{ fontSize: 12, color: isGoodChange ? COLORS.good : COLORS.critical, margin: 0 }}>
              {compareLabel} 대비 {diff >= 0 ? "+" : ""}
              {diff.toLocaleString("ko-KR")}
              {unit}
              {percent !== null && ` (${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%)`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
