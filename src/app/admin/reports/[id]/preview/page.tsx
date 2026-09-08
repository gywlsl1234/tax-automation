import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  aggregateByAccount,
  buildIncomeStatementGrid,
  cumulativeSeries,
  lastMonthWithAnyData,
  monthlyLedgerTotals,
  sumThroughMonth,
  topVendors,
} from "@/lib/report/aggregate";
import type { LedgerEntryRow } from "@/lib/report/types";
import { ReportView } from "@/components/report/ReportView";

export const dynamic = "force-dynamic";

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reportId } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, base_year, compare_year, currency_unit, client_id")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    return (
      <main style={{ maxWidth: 640, margin: "80px auto", fontFamily: "sans-serif" }}>
        <p style={{ color: "crimson" }}>보고서를 찾을 수 없습니다: {reportError?.message}</p>
      </main>
    );
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("company_name, ceo_name, biz_reg_no")
    .eq("id", report.client_id)
    .single();

  if (clientError || !client) {
    return (
      <main style={{ maxWidth: 640, margin: "80px auto", fontFamily: "sans-serif" }}>
        <p style={{ color: "crimson" }}>고객사 정보를 찾을 수 없습니다: {clientError?.message}</p>
      </main>
    );
  }

  const [{ data: incomeItems }, { data: ledgerEntries }, { data: notes }] = await Promise.all([
    supabase
      .from("income_statement_items")
      .select("account_name, year, month, amount")
      .eq("report_id", reportId),
    supabase
      .from("ledger_entries")
      .select(
        "year, entry_type, entry_date, entry_no, vendor, vendor_reg_no, item_name, supply_amount, vat_amount, total_amount, account_name, card_company, card_number"
      )
      .eq("report_id", reportId),
    supabase
      .from("report_notes")
      .select("section, content, updated_by, updated_at")
      .eq("report_id", reportId),
  ]);

  const year = report.base_year;
  const compareYear = report.compare_year;
  const incomeGrid = buildIncomeStatementGrid(incomeItems ?? [], year);
  const entries = (ledgerEntries ?? []) as LedgerEntryRow[];

  const sales = {
    monthly: monthlyLedgerTotals(entries, "매출", year),
    cumulative: cumulativeSeries(monthlyLedgerTotals(entries, "매출", year)),
    composition: aggregateByAccount(entries, "매출", year),
    topVendors: topVendors(entries, "매출", year),
  };
  const purchase = {
    monthly: monthlyLedgerTotals(entries, "매입", year),
    cumulative: cumulativeSeries(monthlyLedgerTotals(entries, "매입", year)),
    composition: aggregateByAccount(entries, "매입", year),
    topVendors: topVendors(entries, "매입", year),
  };

  // compare_year가 설정되어 있고 해당 연도 데이터가 실제로 업로드되어 있을 때만
  // 전기대비 비교를 계산한다 (없으면 KpiCard가 비교 표시를 생략한다).
  //
  // 당기는 아직 다 지나지 않아 일부 월만 입력되어 있는 경우가 많다(예: 8월까지만).
  // 그런데 전기는 이미 지난 해라 12개월 전체가 들어있으면, 단순히 연간 합계끼리
  // 비교하면 "당기 8개월 vs 전기 12개월"처럼 기간이 달라 왜곡된다. 그래서 당기
  // 데이터가 실제로 입력된 마지막 달까지만 잘라서(동기간) 전기와 비교한다.
  const lastMonth = lastMonthWithAnyData(incomeItems ?? [], year);

  const compareIncomeMajor = compareYear
    ? buildIncomeStatementGrid(incomeItems ?? [], compareYear).major.map((row) => ({
        ...row,
        total: sumThroughMonth(row.monthly, lastMonth),
      }))
    : null;

  return (
    <main style={{ padding: "24px 16px" }}>
      <p style={{ maxWidth: 960, margin: "0 auto 16px" }}>
        <Link href="/admin/clients">← 고객사 목록으로</Link>
      </p>
      <ReportView
        client={{ companyName: client.company_name, ceoName: client.ceo_name, bizRegNo: client.biz_reg_no }}
        report={{ baseYear: report.base_year, compareYear: report.compare_year, currencyUnit: report.currency_unit }}
        incomeGrid={incomeGrid}
        sales={sales}
        purchase={purchase}
        compareIncomeMajor={compareIncomeMajor}
        lastMonth={lastMonth}
        notes={(notes ?? []).map((n) => ({
          section: n.section,
          content: n.content,
          updatedBy: n.updated_by,
          updatedAt: n.updated_at,
        }))}
      />
    </main>
  );
}
