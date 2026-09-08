// dataviz 스킬의 검증된 기본 팔레트에서 그대로 가져온 값 (light 모드).
export const COLORS = {
  sales: "#1baf7a", // 카테고리 슬롯 3 (aqua)
  purchase: "#eb6834", // 카테고리 슬롯 2 (orange)
  profit: "#2a78d6", // 카테고리 슬롯 1 (blue)
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
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  surface: "#fcfcfb",
} as const;
