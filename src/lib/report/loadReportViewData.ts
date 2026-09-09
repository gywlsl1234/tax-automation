import "server-only";
import { cache } from "react";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ReportViewData } from "@/components/report/ReportView";
import type { LedgerEntryRow } from "./types";
import {
  aggregateByAccount,
  buildIncomeStatementGrid,
  cumulativeSeries,
  findMajorCategoryTotal,
  lastMonthWithAnyData,
  monthlyLedgerTotals,
  sumThroughMonth,
  topVendors,
} from "./aggregate";
import { estimateComprehensiveIncomeTax } from "@/lib/tax/incomeTax";
import { estimateCorporateTax } from "@/lib/tax/corporateTax";
import { estimateVat, estimateSimplifiedVat, isVatEnabled, type VatPeriodEstimate, type VatPeriodType, type VatTaxpayerType } from "./vat";

export type LoadedReportViewData = Omit<
  ReportViewData,
  "onEditIncomeCell" | "onEditNote" | "onEditTaxOverride" | "onEditVatOverride" | "onEditCorpTaxOverride"
>;

/**
 * 관리자 미리보기(/admin/reports/[id]/preview)와 고객 열람 화면(/r/[token])이
 * 공통으로 쓰는 보고서 데이터 조회/집계 로직. 두 화면이 같은 계산식을 쓰도록
 * 보장해 "관리자가 수정하면 고객 화면에도 즉시 반영된다"는 요구를 자연스럽게
 * 만족시킨다(같은 함수로 매번 새로 읽으므로 캐시 불일치가 없다).
 *
 * `cache()`로 감싸 같은 요청(예: generateMetadata + 페이지 본문) 안에서 중복
 * 호출되어도 DB 조회는 한 번만 일어난다 — 요청 간에는 공유되지 않는다.
 */
export const loadReportViewData = cache(async function loadReportViewData(
  reportId: string
): Promise<{ ok: true; data: LoadedReportViewData } | { ok: false; error: string }> {
  const supabase = getSupabaseAdminClient();

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select(
      "id, base_year, report_month, compare_year, currency_unit, client_id, manual_tax_override, manual_annual_income, manual_income_tax, manual_local_tax, manual_vat_override, manual_vat_periods, manual_corp_tax_override, manual_corp_annual_income, manual_corp_tax, manual_corp_local_tax"
    )
    .eq("id", reportId)
    .single();
  if (reportError || !report) {
    return { ok: false, error: `보고서를 찾을 수 없습니다: ${reportError?.message}` };
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("company_name, ceo_name, biz_reg_no, entity_type, vat_period_type, vat_taxpayer_type, simplified_vat_rate")
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

  const netIncomeRow = findMajorCategoryTotal(incomeGrid.major, "당기순이익");
  const cumulativeIncome = netIncomeRow ? sumThroughMonth(netIncomeRow.monthly, lastMonth) : 0;
  const taxOverrideInput = {
    enabled: report.manual_tax_override,
    annualIncome: report.manual_annual_income,
    incomeTax: report.manual_income_tax,
    localTax: report.manual_local_tax,
  };
  const taxEstimate = report.manual_tax_override
    ? {
        annualizedIncome: report.manual_annual_income ?? 0,
        incomeTax: report.manual_income_tax ?? 0,
        localIncomeTax: report.manual_local_tax ?? 0,
        totalTax: (report.manual_income_tax ?? 0) + (report.manual_local_tax ?? 0),
        isManualOverride: true,
      }
    : { ...estimateComprehensiveIncomeTax({ cumulativeIncome, monthsElapsed: lastMonth }), isManualOverride: false };

  const corpTaxOverrideInput = {
    enabled: report.manual_corp_tax_override,
    annualIncome: report.manual_corp_annual_income,
    corpTax: report.manual_corp_tax,
    localTax: report.manual_corp_local_tax,
  };
  const corpTaxEstimate = report.manual_corp_tax_override
    ? {
        annualizedIncome: report.manual_corp_annual_income ?? 0,
        corpTax: report.manual_corp_tax ?? 0,
        localCorpTax: report.manual_corp_local_tax ?? 0,
        totalTax: (report.manual_corp_tax ?? 0) + (report.manual_corp_local_tax ?? 0),
        isManualOverride: true,
      }
    : { ...estimateCorporateTax({ cumulativeIncome, monthsElapsed: lastMonth }), isManualOverride: false };

  const vatPeriodType = (client.vat_period_type as VatPeriodType) ?? "semiannual";
  const vatTaxpayerType = (client.vat_taxpayer_type as VatTaxpayerType) ?? "general";
  const vatEnabled = isVatEnabled(vatTaxpayerType);
  const monthlySalesVat = monthlyLedgerTotals(entries, "매출", year, "vat_amount");
  const monthlyPurchaseVat = monthlyLedgerTotals(entries, "매입", year, "vat_amount");
  const vatOverrideInput = {
    enabled: report.manual_vat_override,
    periods: (report.manual_vat_periods as VatPeriodEstimate[] | null) ?? null,
  };

  const simplifiedVatRate = client.simplified_vat_rate;
  function computeAutoVatEstimate(): VatPeriodEstimate[] {
    if (!vatEnabled) return [];
    if (vatTaxpayerType === "simplified_invoice") {
      return estimateSimplifiedVat({
        monthlySalesAmount: sales.monthly,
        monthlyPurchaseAmount: purchase.monthly,
        lastMonth,
        periodType: vatPeriodType,
        vatRatePercent: simplifiedVatRate ?? 0,
      });
    }
    return estimateVat({ monthlySalesVat, monthlyPurchaseVat, lastMonth, periodType: vatPeriodType });
  }

  const vatEstimate: VatPeriodEstimate[] =
    vatEnabled && report.manual_vat_override && vatOverrideInput.periods
      ? vatOverrideInput.periods.map((p) => ({ ...p, status: "manual" as const }))
      : computeAutoVatEstimate();

  return {
    ok: true,
    data: {
      client: {
        companyName: client.company_name,
        ceoName: client.ceo_name,
        bizRegNo: client.biz_reg_no,
        entityType: client.entity_type as "individual" | "corporate",
        vatPeriodType,
        vatTaxpayerType,
        simplifiedVatRate,
      },
      cumulativeIncome,
      taxEstimate,
      taxOverrideInput,
      corpTaxEstimate,
      corpTaxOverrideInput,
      vatEnabled,
      vatEstimate,
      vatOverrideInput,
      monthlySalesVat,
      monthlyPurchaseVat,
      report: {
        baseYear: report.base_year,
        reportMonth: report.report_month,
        compareYear: report.compare_year,
        currencyUnit: report.currency_unit,
      },
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
});
