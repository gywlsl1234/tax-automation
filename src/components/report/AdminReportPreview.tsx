"use client";

import { useState } from "react";
import { estimateComprehensiveIncomeTax } from "@/lib/tax/incomeTax";
import { ReportView, type ReportViewData } from "./ReportView";
import type { TaxOverrideInput } from "./IncomeTaxSection";

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
            ...estimateComprehensiveIncomeTax({ cumulativeIncome: prev.cumulativeIncome, monthsElapsed: prev.lastMonth }),
            isManualOverride: false,
          },
    }));
  }

  return (
    <ReportView
      {...data}
      onEditIncomeCell={handleEditIncomeCell}
      onEditNote={handleEditNote}
      onEditTaxOverride={handleEditTaxOverride}
    />
  );
}
