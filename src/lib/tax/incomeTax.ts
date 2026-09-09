import { roundTo10Won } from "@/lib/report/money";

/**
 * 개인사업자 예상 종합소득세 "참고용" 단순 추정 모듈.
 *
 * 실제 종합소득세는 소득공제·세액공제·감면 등 개인별 사정에 따라 크게 달라진다.
 * 이 모듈은 그런 항목을 전혀 반영하지 않고, 누적 손익을 연 환산한 금액에 2024년
 * 기준 종합소득세 누진세율만 적용한 "대략적인 참고치"를 계산한다. 실제 신고 세액과
 * 다를 수 있다는 안내문구(ReportView)와 항상 함께 표시해야 한다.
 *
 * 향후 법인세 추정이 필요해지면 같은 디렉터리에 `corporateTax.ts`를 추가하고
 * 동일한 시그니처 패턴(입력: 누적 실적, 출력: {annualizedIncome, ...Tax})을
 * 따르면 된다 — clients.entity_type로 개인/법인을 구분하는 상위 로직은
 * 그대로 재사용할 수 있다.
 */

interface TaxBracket {
  upTo: number; // 이 과세표준까지 적용 (Infinity 가능)
  rate: number; // 세율
  deduction: number; // 누진공제액
}

// 2024년 귀속 종합소득세 누진세율표 (지방소득세 별도)
const BRACKETS: TaxBracket[] = [
  { upTo: 14_000_000, rate: 0.06, deduction: 0 },
  { upTo: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { upTo: 500_000_000, rate: 0.4, deduction: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { upTo: Infinity, rate: 0.45, deduction: 65_940_000 },
];

const LOCAL_INCOME_TAX_RATE = 0.1; // 지방소득세 = 소득세의 10%

export interface IncomeTaxEstimate {
  annualizedIncome: number;
  incomeTax: number;
  localIncomeTax: number;
  totalTax: number;
}

function calcIncomeTax(taxBase: number): number {
  if (taxBase <= 0) return 0;
  const bracket = BRACKETS.find((b) => taxBase <= b.upTo)!;
  return Math.max(0, Math.round(taxBase * bracket.rate - bracket.deduction));
}

/**
 * @param cumulativeIncome 기준연도 들어 지금까지의 누적 당기순이익(과세표준 근사치)
 * @param monthsElapsed 누적 손익이 반영된 실제 영업 개월 수 — 이 개월수 기준으로 연 환산한다
 * @param monthsInYear 연 환산의 기준이 되는 총 개월 수(기본 12). 연중 개업한 신규
 * 사업자는 개업월부터 12월까지의 개월 수(예: 4월 개업이면 9)를 넘겨, 영업하지도
 * 않은 개업 전 달까지 "연간"에 포함시켜 월평균을 낮추는 왜곡을 막는다.
 */
export function estimateComprehensiveIncomeTax(params: {
  cumulativeIncome: number;
  monthsElapsed: number;
  monthsInYear?: number;
}): IncomeTaxEstimate {
  const monthsInYear = Math.max(1, Math.min(12, params.monthsInYear ?? 12));
  const months = Math.min(monthsInYear, Math.max(1, params.monthsElapsed));
  const annualizedIncome = roundTo10Won((params.cumulativeIncome / months) * monthsInYear);
  const incomeTax = roundTo10Won(calcIncomeTax(annualizedIncome));
  const localIncomeTax = roundTo10Won(incomeTax * LOCAL_INCOME_TAX_RATE);
  return {
    annualizedIncome,
    incomeTax,
    localIncomeTax,
    totalTax: incomeTax + localIncomeTax,
  };
}
