/**
 * "균등 월환산" 예상치 계산. 기준월(lastMonth)까지는 실적 그대로 두고, 그 뒤
 * 남은 달은 1~lastMonth 월평균값으로 채운다. 요약 그래프(매출/영업이익)와
 * 예상 부가세(매출세액/매입세액) 양쪽에서 공용으로 쓴다.
 *
 * 예: 8월까지 실적이면 9~12월 = (1~8월 합계 / 8). lastMonth가 0(실적 전혀
 * 없음)이면 전체를 0으로 채운다. lastMonth가 12면 원본 그대로(예상 구간 없음).
 */
export function projectRemainingMonths(monthlyActual: number[], lastMonth: number): number[] {
  const clampedLastMonth = Math.min(12, Math.max(0, lastMonth));
  if (clampedLastMonth >= 12) return [...monthlyActual];

  const actualSum = monthlyActual.slice(0, clampedLastMonth).reduce((s, v) => s + v, 0);
  const monthlyAverage = clampedLastMonth > 0 ? actualSum / clampedLastMonth : 0;

  return monthlyActual.map((value, idx) => (idx < clampedLastMonth ? value : monthlyAverage));
}

export interface ActualProjectedSeries {
  /** 1~lastMonth는 실적값, 이후는 null (차트에서 실선 구간만 그리기 위함) */
  actual: (number | null)[];
  /** 1~lastMonth는 null, 이후는 예상값 (차트에서 점선 구간만 그리기 위함).
   * lastMonth 지점은 실적/예상 선이 끊어지지 않도록 실적값과 동일하게 채운다. */
  projected: (number | null)[];
  lastMonth: number;
}

export function splitActualProjected(monthlyActual: number[], lastMonth: number): ActualProjectedSeries {
  const clampedLastMonth = Math.min(12, Math.max(0, lastMonth));
  const projectedFull = projectRemainingMonths(monthlyActual, clampedLastMonth);

  const actual = monthlyActual.map((value, idx) => (idx < clampedLastMonth ? value : null));
  const projected = projectedFull.map((value, idx) => {
    if (idx < clampedLastMonth - 1) return null;
    return value; // lastMonth-1(0-indexed)부터 채워 실선과 점선이 이어지게 함
  });

  return { actual, projected, lastMonth: clampedLastMonth };
}
