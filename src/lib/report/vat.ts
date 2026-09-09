import { projectRemainingMonths } from "./projection";

export type VatPeriodType = "semiannual" | "quarterly";

/** 일반과세자=부가세 계산, 간이과세자/면세사업자=부가세 계산 비활성화,
 * 간이과세자(세금계산서발급)=간이과세 계산구조로 부가세 계산 활성화. */
export type VatTaxpayerType = "general" | "simplified" | "simplified_invoice" | "exempt";

/** vatTaxpayerType에 따라 예상 부가세 계산을 노출할지 여부. */
export function isVatEnabled(vatTaxpayerType: VatTaxpayerType): boolean {
  return vatTaxpayerType === "general" || vatTaxpayerType === "simplified_invoice";
}

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

function periodsFor(periodType: VatPeriodType) {
  return periodType === "quarterly" ? QUARTERLY_PERIODS : SEMIANNUAL_PERIODS;
}

function statusFor(months: number[], lastMonth: number): VatPeriodEstimate["status"] {
  const allActual = months.every((m) => m <= lastMonth);
  const allProjected = months.every((m) => m > lastMonth);
  return allActual ? "actual" : allProjected ? "projected" : "mixed";
}

/**
 * 일반과세자 예상 부가세 = 매출세액 합계 − 매입세액 합계 (단순 차감).
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

  return periodsFor(periodType).map(({ label, months }) => {
    const salesVat = months.reduce((s, m) => s + projectedSales[m - 1], 0);
    const purchaseVat = months.reduce((s, m) => s + projectedPurchase[m - 1], 0);
    return { label, months, salesVat, purchaseVat, payableVat: salesVat - purchaseVat, status: statusFor(months, lastMonth) };
  });
}

const SIMPLIFIED_PURCHASE_CREDIT_RATE = 0.005; // 매입세액공제 = 매입액(공급대가) × 0.5%

/**
 * 간이과세자(세금계산서발급) 예상 부가세 — "간이과세자의 계산구조"를 그대로 쓴다.
 *   납부세액 = 매출액(공급대가) × 업종별 부가가치율 × 10% − 매입액(공급대가) × 0.5%
 * 일반과세자처럼 매출세액을 그대로 세금계산서에서 가져오는 게 아니라, 업종별
 * 부가가치율(거래처마다 관리자가 입력, clients.simplified_vat_rate)을 곱해서
 * 간이과세 특유의 낮은 실효세율을 반영한다. 결과 음수는 0으로 처리한다
 * (간이과세자는 환급이 없다).
 */
export function estimateSimplifiedVat(params: {
  monthlySalesAmount: number[]; // 12개월, 매출 공급대가(또는 공급가액) 실적
  monthlyPurchaseAmount: number[]; // 매입 공급대가(또는 공급가액) 실적
  lastMonth: number;
  periodType: VatPeriodType;
  vatRatePercent: number; // 업종별 부가가치율(%), 예: 15
}): VatPeriodEstimate[] {
  const { monthlySalesAmount, monthlyPurchaseAmount, lastMonth, periodType, vatRatePercent } = params;
  const projectedSales = projectRemainingMonths(monthlySalesAmount, lastMonth);
  const projectedPurchase = projectRemainingMonths(monthlyPurchaseAmount, lastMonth);
  const rate = vatRatePercent / 100;

  return periodsFor(periodType).map(({ label, months }) => {
    const salesAmount = months.reduce((s, m) => s + projectedSales[m - 1], 0);
    const purchaseAmount = months.reduce((s, m) => s + projectedPurchase[m - 1], 0);
    const salesVat = Math.round(salesAmount * rate * 0.1);
    const purchaseVat = Math.round(purchaseAmount * SIMPLIFIED_PURCHASE_CREDIT_RATE);
    return {
      label,
      months,
      salesVat,
      purchaseVat,
      payableVat: Math.max(0, salesVat - purchaseVat),
      status: statusFor(months, lastMonth),
    };
  });
}
