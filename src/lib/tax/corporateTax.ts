import { roundTo10Won } from "@/lib/report/money";

/**
 * 법인사업자 예상 법인세 "참고용" 단순 추정 모듈. incomeTax.ts와 동일한
 * 시그니처 패턴(입력: 누적 손익, 출력: {annualizedIncome, ...Tax})을 따른다.
 *
 * 실제 법인세는 세무조정(익금/손금산입), 각종 공제·감면에 따라 크게 달라진다.
 * 이 모듈은 그런 항목을 전혀 반영하지 않고, 누적 손익을 연 환산한 금액(사업연도
 * 전체 소득 근사치)에 2024년 기준 법인세 누진세율만 적용한 "대략적인 참고치"를
 * 계산한다. 실제 신고 세액과 다를 수 있다는 안내문구와 항상 함께 표시해야 한다.
 */

interface TaxBracket {
  upTo: number; // 이 과세표준까지 적용 (Infinity 가능)
  rate: number;
  deduction: number;
}

// 2024년 귀속 법인세 누진세율표(지방소득세 별도)
const BRACKETS: TaxBracket[] = [
  { upTo: 200_000_000, rate: 0.09, deduction: 0 },
  { upTo: 20_000_000_000, rate: 0.19, deduction: 20_000_000 },
  { upTo: 300_000_000_000, rate: 0.21, deduction: 420_000_000 },
  { upTo: Infinity, rate: 0.24, deduction: 9_420_000_000 },
];

const LOCAL_CORP_TAX_RATE = 0.1; // 법인지방소득세 = 법인세의 10%

export interface CorporateTaxEstimate {
  annualizedIncome: number;
  corpTax: number;
  localCorpTax: number;
  totalTax: number;
}

function calcCorpTax(taxBase: number): number {
  if (taxBase <= 0) return 0;
  const bracket = BRACKETS.find((b) => taxBase <= b.upTo)!;
  return Math.max(0, Math.round(taxBase * bracket.rate - bracket.deduction));
}

/**
 * @param cumulativeIncome 기준연도 들어 지금까지의 누적 당기순이익(과세표준 근사치)
 * @param monthsElapsed 누적 손익이 반영된 실제 영업 개월 수 — 이 개월수 기준으로 연 환산한다
 * @param monthsInYear 연 환산의 기준이 되는 총 개월 수(기본 12). 연중 개업한 신규
 * 법인은 개업월부터 12월까지의 개월 수를 넘겨, 영업하지도 않은 개업 전 달까지
 * "연간"에 포함시켜 월평균을 낮추는 왜곡을 막는다.
 */
export function estimateCorporateTax(params: {
  cumulativeIncome: number;
  monthsElapsed: number;
  monthsInYear?: number;
}): CorporateTaxEstimate {
  const monthsInYear = Math.max(1, Math.min(12, params.monthsInYear ?? 12));
  const months = Math.min(monthsInYear, Math.max(1, params.monthsElapsed));
  const annualizedIncome = roundTo10Won((params.cumulativeIncome / months) * monthsInYear);
  const corpTax = roundTo10Won(calcCorpTax(annualizedIncome));
  const localCorpTax = roundTo10Won(corpTax * LOCAL_CORP_TAX_RATE);
  return {
    annualizedIncome,
    corpTax,
    localCorpTax,
    totalTax: corpTax + localCorpTax,
  };
}
