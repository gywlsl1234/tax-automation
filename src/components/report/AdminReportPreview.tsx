"use client";

import { useState } from "react";
import { estimateComprehensiveIncomeTax } from "@/lib/tax/incomeTax";
import { estimateCorporateTax } from "@/lib/tax/corporateTax";
import { estimateVat, estimateSimplifiedVat } from "@/lib/report/vat";
import { ReportView, type ReportViewData } from "./ReportView";
import type { TaxOverrideInput } from "./IncomeTaxSection";
import type { CorpTaxOverrideInput } from "./CorporateTaxSection";
import type { VatOverrideInput } from "./VatSection";

/**
 * 관리자 미리보기 전용 래퍼. ReportView는 순수 표시 컴포넌트로 유지하고,
 * 이 컴포넌트가 수정 API 호출과 화면 상태 갱신(=고객 화면에도 반영될 DB 값의
 * 즉시 반영)을 담당한다. 고객 열람 화면(Phase 5, /r/[token])은 이 래퍼 없이
 * ReportView만 그대로 재사용하면 편집 기능 없이 읽기 전용으로 렌더링된다.
 */
export function AdminReportPreview({
  reportId,
  ...initialData
}: ReportViewData & { reportId: string }) {
  const [data, setData] = useState(initialData);

  /** loadReportViewData.ts의 computeFirstOperatingMonth 이후 로직과 동일하게,
   * 연중 개업한 신규 사업자는 개업 전 달을 "경과 개월"/"연간 개월"에서 제외한다
   * (수동입력을 껐을 때 되돌아갈 자동계산 값도 서버와 동일한 결과가 나오도록). */
  function operatingMonthsFor(prev: typeof data) {
    const monthsElapsed = Math.max(1, prev.lastMonth - prev.firstOperatingMonth + 1);
    const monthsInYear = Math.max(1, 13 - prev.firstOperatingMonth);
    return { monthsElapsed, monthsInYear };
  }

  async function handleEditIncomeCell(itemId: string, newAmount: number) {
    const res = await fetch(`/api/admin/income-statement-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: newAmount }),
    });
    const json = await res.json();
    if (!res.ok) {
      window.alert(json.error ?? "수정에 실패했습니다.");
      return;
    }

    setData((prev) => {
      const patchRows = (rows: typeof prev.incomeGrid.major) =>
        rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) =>
            cell.id === itemId
              ? { ...cell, amount: json.amount, isEdited: true, editedBy: json.edited_by, editedAt: json.edited_at }
              : cell
          ),
          monthly: row.cells.map((cell) => (cell.id === itemId ? json.amount : cell.amount)),
          total: row.cells.reduce((s, cell) => s + (cell.id === itemId ? json.amount : cell.amount), 0),
        }));
      return {
        ...prev,
        incomeGrid: {
          major: patchRows(prev.incomeGrid.major),
          detail: patchRows(prev.incomeGrid.detail),
        },
      };
    });
  }

  async function handleEditNote(noteId: string, newContent: string) {
    const res = await fetch(`/api/admin/report-notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    const json = await res.json();
    if (!res.ok) {
      window.alert(json.error ?? "수정에 실패했습니다.");
      return;
    }

    setData((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === noteId ? { ...n, content: json.content, updatedBy: json.updated_by, updatedAt: json.updated_at } : n
      ),
    }));
  }

  async function handleEditTaxOverride(input: TaxOverrideInput) {
    const res = await fetch(`/api/admin/reports/${reportId}/tax-override`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      window.alert(json.error ?? "수정에 실패했습니다.");
      return;
    }

    setData((prev) => ({
      ...prev,
      taxOverrideInput: input,
      taxEstimate: input.enabled
        ? {
            annualizedIncome: input.annualIncome ?? 0,
            incomeTax: input.incomeTax ?? 0,
            localIncomeTax: input.localTax ?? 0,
            totalTax: (input.incomeTax ?? 0) + (input.localTax ?? 0),
            isManualOverride: true,
          }
        : {
            ...estimateComprehensiveIncomeTax({ cumulativeIncome: prev.cumulativeIncome, ...operatingMonthsFor(prev) }),
            isManualOverride: false,
          },
    }));
  }

  async function handleEditCorpTaxOverride(input: CorpTaxOverrideInput) {
    const res = await fetch(`/api/admin/reports/${reportId}/corp-tax-override`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      window.alert(json.error ?? "수정에 실패했습니다.");
      return;
    }

    setData((prev) => ({
      ...prev,
      corpTaxOverrideInput: input,
      corpTaxEstimate: input.enabled
        ? {
            annualizedIncome: input.annualIncome ?? 0,
            corpTax: input.corpTax ?? 0,
            localCorpTax: input.localTax ?? 0,
            totalTax: (input.corpTax ?? 0) + (input.localTax ?? 0),
            isManualOverride: true,
          }
        : {
            ...estimateCorporateTax({ cumulativeIncome: prev.cumulativeIncome, ...operatingMonthsFor(prev) }),
            isManualOverride: false,
          },
    }));
  }

  function recomputeAutoVatEstimate(prev: typeof data) {
    if (!prev.vatEnabled) return [];
    if (prev.client.vatTaxpayerType === "simplified_invoice") {
      return estimateSimplifiedVat({
        monthlySalesAmount: prev.sales.monthly,
        monthlyPurchaseAmount: prev.purchase.monthly,
        lastMonth: prev.lastMonth,
        periodType: prev.client.vatPeriodType,
        vatRatePercent: prev.client.simplifiedVatRate ?? 0,
        firstOperatingMonth: prev.firstOperatingMonth,
      });
    }
    return estimateVat({
      monthlySalesVat: prev.monthlySalesVat,
      monthlyPurchaseVat: prev.monthlyPurchaseVat,
      lastMonth: prev.lastMonth,
      periodType: prev.client.vatPeriodType,
      firstOperatingMonth: prev.firstOperatingMonth,
    });
  }

  async function handleEditVatOverride(input: VatOverrideInput) {
    const res = await fetch(`/api/admin/reports/${reportId}/vat-override`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      window.alert(json.error ?? "수정에 실패했습니다.");
      return;
    }

    setData((prev) => ({
      ...prev,
      vatOverrideInput: input,
      vatEstimate:
        input.enabled && input.periods
          ? input.periods.map((p, idx) => ({
              ...p,
              months: prev.vatEstimate[idx]?.months ?? [],
              status: "manual" as const,
            }))
          : recomputeAutoVatEstimate(prev),
    }));
  }

  return (
    <ReportView
      {...data}
      onEditIncomeCell={handleEditIncomeCell}
      onEditNote={handleEditNote}
      onEditTaxOverride={handleEditTaxOverride}
      onEditCorpTaxOverride={handleEditCorpTaxOverride}
      onEditVatOverride={handleEditVatOverride}
    />
  );
}
