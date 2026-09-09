// 브랜드 색상(매출/이익/매입/부가세)은 작업지시서(UI/UX 고도화) 16번 색상값을
// 그대로 반영한다. categorical(구성비 차트 다중 계열용)만 dataviz 스킬의
// 접근성 검증된 팔레트를 그대로 유지한다 — 임의로 브랜드 색과 맞추면 계열간
// 대비가 깨질 수 있다.
export const COLORS = {
  sales: "#10B981", // Primary Green
  profit: "#2F7BD8", // Profit Blue
  purchase: "#FF7A45", // Purchase Orange
  vat: "#F59E0B", // VAT Amber
  categorical: [
    "#2a78d6",
    "#eb6834",
    "#1baf7a",
    "#eda100",
    "#e87ba4",
    "#008300",
    "#4a3aa7",
    "#e34948",
  ],
  good: "#0ca30c",
  critical: "#d03b3b",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  muted: "#898781",
  gridline: "#E5E7EB",
  surface: "#fcfcfb",
} as const;
