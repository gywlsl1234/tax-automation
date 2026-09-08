import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ReportViewData } from "@/components/report/ReportView";
import type { LedgerEntryRow } from "./types";
import {
  aggregateByAccount,
  buildIncomeStatementGrid,
  cumulativeSeries,
  lastMonthWithAnyData,
  monthlyLedgerTotals,
  sumThroughMonth,
  topVendors,
} from "./aggregate";

export type LoadedReportViewData = Omit<ReportViewData, "onEditIncomeCell" | "onEditNote">;

/**
 * 관리자 미리보기(/admin/reports/[id]/preview)와 고객 열람 화면(/r/[token])이
 * 공통으로 쓰는 보고서 데이터 조회/집계 로직. 두 화면이 같은 계산식을 쓰도록
 * 보장해 "관리자가 수정하면 고객 화면에도 즉시 반영된다"는 요구를 자연스럽게
 * 만족시킨다(같은 함수로 매번 새로 읽으므로 캐시 불일치가 없다).
 */
export async function loadReportViewData(
  reportId: string
): Promise<{ ok: true; data: LoadedReportViewData } | { ok: false; error: string }> {
  const supabase = getSupabaseAdminClient();

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, base_year, compare_year, currency_unit, client_id")
    .eq("id", reportId)
    .single();
  if (reportError || !report) {
    return { ok: false, error: `보고서를 찾을 수 없습니다: ${reportError?.message}` };
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("company_name, ceo_name, biz_reg_no")
    .eq("id", report.client_id)
    .single();
  if (clientError || !client) {
    return { ok: false, error: `고객사 정보를 찾을 수 없습니다: ${clientError?.message}` };
  }

  const [{ data: incomeItems }, { data: ledgerEntries }, { data: notes }] = await Promise.all([
    supabase
      .from("income_statement_items")
      .select("id, account_name, year, month, amount, is_edited, edited_by, edited_at")
      .eq("report_id", reportId),
    supabase
      .from("ledger_entries")
      .select(
        "year, entry_type, entry_date, entry_no, vendor, vendor_reg_no, item_name, supply_amount, vat_amount, total_amount, account_name, card_company, card_number"
      )
      .eq("report_id", reportId),
    supabase
      .from("report_notes")
      .select("id, section, content, updated_by, updated_at")
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

  const lastMonth = lastMonthWithAnyData(incomeItems ?? [], year);
  const compareIncomeMajor = compareYear
    ? buildIncomeStatementGrid(incomeItems ?? [], compareYear).major.map((row) => ({
        ...row,
        total: sumThroughMonth(row.monthly, lastMonth),
      }))
    : null;

  return {
    ok: true,
    data: {
      client: { companyName: client.company_name, ceoName: client.ceo_name, bizRegNo: client.biz_reg_no },
      report: { baseYear: report.base_year, compareYear: report.compare_year, currencyUnit: report.currency_unit },
      incomeGrid,
      sales,
      purchase,
      compareIncomeMajor,
      lastMonth,
      notes: (notes ?? []).map((n) => ({
        id: n.id,
        section: n.section,
        content: n.content,
        updatedBy: n.updated_by,
        updatedAt: n.updated_at,
      })),
    },
  };
}
