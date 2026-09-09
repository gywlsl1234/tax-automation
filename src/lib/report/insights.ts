import { formatCompactWon } from "./money";

export interface Insight {
  type: "good" | "warn" | "info";
  text: string;
}

function pctChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * rule-based 핵심 포인트 문장 생성. LLM 없이, 이미 계산된 숫자들(전기대비
 * 증감률, 이익률, 거래처 집중도, 예상 부가세)을 조건별 문장 템플릿으로
 * 변환한다. 입력은 전부 ReportView가 이미 들고 있는 값이므로 여기서는
 * 순수 함수로만 동작한다(추가 DB 조회 없음).
 */
export function generateInsights(params: {
  salesTotal: number;
  salesCompare?: number;
  operatingProfit: number;
  operatingProfitCompare?: number;
  netIncome: number;
  grossProfitRatio: number | null; // 매출총이익 / 매출액, 데이터 없으면 null
  operatingProfitRatio: number | null; // 영업이익 / 매출액
  topVendorRatio: number | null; // 매출 거래처 중 1위 비중(0~1)
  upcomingVat: { label: string; payableVat: number } | null;
  /** 연환산 계산에 쓰인 실제 영업 시작월(1~12). 정상 영업 중이면 1. */
  firstOperatingMonth: number;
}): Insight[] {
  const insights: Insight[] = [];

  if (params.firstOperatingMonth > 1) {
    insights.push({
      type: "info",
      text: `${params.firstOperatingMonth}월부터 실적이 있는 신규 사업자로, 예상치는 ${params.firstOperatingMonth}월 이후 실적만을 기준으로 계산되었습니다.`,
    });
  }

  const salesChange = pctChange(params.salesTotal, params.salesCompare);
  if (salesChange !== null) {
    insights.push({
      type: salesChange >= 0 ? "good" : "warn",
      text: `매출이 전기 동기간 대비 ${Math.abs(salesChange).toFixed(1)}% ${salesChange >= 0 ? "증가" : "감소"}했습니다.`,
    });
  }

  const profitChange = pctChange(params.operatingProfit, params.operatingProfitCompare);
  if (profitChange !== null) {
    insights.push({
      type: profitChange >= 0 ? "good" : "warn",
      text: `영업이익이 전기 동기간 대비 ${Math.abs(profitChange).toFixed(1)}% ${
        profitChange >= 0 ? "증가" : "감소"
      }했습니다.`,
    });
  }

  if (params.grossProfitRatio !== null) {
    insights.push({ type: "info", text: `매출총이익률은 ${(params.grossProfitRatio * 100).toFixed(1)}%입니다.` });
  }

  if (params.operatingProfitRatio !== null) {
    const ratio = params.operatingProfitRatio * 100;
    insights.push({
      type: ratio >= 0 ? "good" : "warn",
      text:
        ratio >= 0
          ? `영업이익률은 ${ratio.toFixed(1)}%입니다.`
          : `영업이익률이 ${ratio.toFixed(1)}%로 적자 상태입니다.`,
    });
  }

  if (params.topVendorRatio !== null && params.topVendorRatio >= 0.3) {
    insights.push({
      type: "warn",
      text: `매출 상위 거래처 1곳의 비중이 ${(params.topVendorRatio * 100).toFixed(0)}%로 집중되어 있습니다.`,
    });
  }

  if (params.upcomingVat) {
    insights.push({
      type: "info",
      text: `${params.upcomingVat.label} 예상 납부 부가세는 약 ${formatCompactWon(params.upcomingVat.payableVat)}원입니다.`,
    });
  }

  if (params.netIncome < 0) {
    insights.push({ type: "warn", text: "당기순이익이 적자입니다." });
  }

  return insights;
}
