/**
 * "균등 월환산" 예상치 계산. 기준월(lastMonth)까지는 실적 그대로 두고, 그 뒤
 * 남은 달은 (개업월~lastMonth) 월평균값으로 채운다. 요약 그래프(매출/영업이익)와
 * 예상 부가세(매출세액/매입세액) 양쪽에서 공용으로 쓴다.
 *
 * 예: 8월까지 실적이면 9~12월 = (1~8월 합계 / 8). lastMonth가 0(실적 전혀
 * 없음)이면 전체를 0으로 채운다. lastMonth가 12면 원본 그대로(예상 구간 없음).
 *
 * @param firstOperatingMonth 기준연도 중 실제 영업을 시작한 달(1~12, 기본 1).
 * 연중 개업한 신규 사업자의 경우, 개업 전 달(실적이 0인 게 당연한 달)까지 월평균
 * 분모에 포함시키면 월평균이 실제보다 낮게 계산된다 — 이를 막기 위해 평균은
 * (firstOperatingMonth~lastMonth) 구간으로만 계산한다. 개업 전 달은 항상 실적
 * 그대로(0)이므로 그 구간의 값 자체는 영향받지 않는다.
 */
export function projectRemainingMonths(
  monthlyActual: number[],
  lastMonth: number,
  firstOperatingMonth: number = 1
): number[] {
  const clampedLastMonth = Math.min(12, Math.max(0, lastMonth));
  if (clampedLastMonth >= 12) return [...monthlyActual];

  const startIdx = Math.min(Math.max(0, firstOperatingMonth - 1), clampedLastMonth);
  const operatingMonths = clampedLastMonth - startIdx;
  const actualSum = monthlyActual.slice(startIdx, clampedLastMonth).reduce((s, v) => s + v, 0);
  const monthlyAverage = operatingMonths > 0 ? actualSum / operatingMonths : 0;

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

export function splitActualProjected(
  monthlyActual: number[],
  lastMonth: number,
  firstOperatingMonth: number = 1
): ActualProjectedSeries {
  const clampedLastMonth = Math.min(12, Math.max(0, lastMonth));
  const projectedFull = projectRemainingMonths(monthlyActual, clampedLastMonth, firstOperatingMonth);

  const actual = monthlyActual.map((value, idx) => (idx < clampedLastMonth ? value : null));
  const projected = projectedFull.map((value, idx) => {
    if (idx < clampedLastMonth - 1) return null;
    return value; // lastMonth-1(0-indexed)부터 채워 실선과 점선이 이어지게 함
  });

  return { actual, projected, lastMonth: clampedLastMonth };
}
