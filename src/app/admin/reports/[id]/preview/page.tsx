import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  aggregateByAccount,
  buildIncomeStatementGrid,
  cumulativeSeries,
  monthlyLedgerTotals,
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
