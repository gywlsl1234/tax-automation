import { projectRemainingMonths } from "./projection";

export type VatPeriodType = "semiannual" | "quarterly";

export interface VatPeriodEstimate {
  label: string;
  months: number[]; // 1~12
  salesVat: number;
  purchaseVat: number;
  payableVat: number;
  /** actual = 해당 기간이 전부 실적, projected = 전부 예상, mixed = 실적+예상 혼재,
   * manual = 관리자가 직접 입력한 값(자동계산 미사용) */
  status: "actual" | "projected" | "mixed" | "manual";
}

const SEMIANNUAL_PERIODS: { label: string; months: number[] }[] = [
  { label: "1기 (1~6월)", months: [1, 2, 3, 4, 5, 6] },
  { label: "2기 (7~12월)", months: [7, 8, 9, 10, 11, 12] },
];

const QUARTERLY_PERIODS: { label: string; months: number[] }[] = [
  { label: "1분기 (1~3월)", months: [1, 2, 3] },
  { label: "2분기 (4~6월)", months: [4, 5, 6] },
  { label: "3분기 (7~9월)", months: [7, 8, 9] },
  { label: "4분기 (10~12월)", months: [10, 11, 12] },
];

/**
 * 예상 부가세 = 매출세액 합계 − 매입세액 합계 (단순 차감).
 * 의제매입세액공제, 신용카드매출전표발행세액공제 등은 반영하지 않는다
 * (화면에도 참고용 추정치임을 안내한다).
 *
 * 실적월(lastMonth) 기준으로 손익계산서와 동일한 "균등 월환산"
 * (`projectRemainingMonths`)을 매출세액/매입세액 각각에 적용한 뒤,
 * 반기(semiannual) 또는 분기(quarterly) 단위로 묶어 기간별 결과를 낸다.
 */
export function estimateVat(params: {
  monthlySalesVat: number[]; // 12개월, 실적만 (lastMonth 이후는 0으로 채워 들어와도 무방)
  monthlyPurchaseVat: number[];
  lastMonth: number;
  periodType: VatPeriodType;
}): VatPeriodEstimate[] {
  const { monthlySalesVat, monthlyPurchaseVat, lastMonth, periodType } = params;
  const projectedSales = projectRemainingMonths(monthlySalesVat, lastMonth);
  const projectedPurchase = projectRemainingMonths(monthlyPurchaseVat, lastMonth);

  const periods = periodType === "quarterly" ? QUARTERLY_PERIODS : SEMIANNUAL_PERIODS;

  return periods.map(({ label, months }) => {
    const salesVat = months.reduce((s, m) => s + projectedSales[m - 1], 0);
    const purchaseVat = months.reduce((s, m) => s + projectedPurchase[m - 1], 0);
    const allActual = months.every((m) => m <= lastMonth);
    const allProjected = months.every((m) => m > lastMonth);
    const status: VatPeriodEstimate["status"] = allActual ? "actual" : allProjected ? "projected" : "mixed";

    return {
      label,
      months,
      salesVat,
      purchaseVat,
      payableVat: salesVat - purchaseVat,
      status,
    };
  });
}
