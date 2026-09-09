/** 예상 세액/부가세 표기를 10원 단위로 반올림한다 (1원 자리 절사 목적). */
export function roundTo10Won(n: number): number {
  return Math.round(n / 10) * 10;
}

/** 억/만원 단위를 자동으로 골라 짧게 표시한다 (차트 축, KPI 보조표시 등). */
export function formatCompactWon(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100_000_000) {
    const sign = n < 0 ? "-" : "";
    return `${sign}${(abs / 100_000_000).toFixed(1)}억`;
  }
  if (abs >= 10_000) {
    const sign = n < 0 ? "-" : "";
    return `${sign}${Math.round(abs / 10_000)}만`;
  }
  return n.toLocaleString("ko-KR");
}

/** 표/카드에 쓰는 전체 자릿수 콤마 포맷. */
export function formatWon(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${ratio.toFixed(digits)}%`;
}
