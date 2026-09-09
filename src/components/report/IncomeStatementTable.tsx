"use client";

import { useState } from "react";
import { formatKstDateTime } from "@/lib/formatDate";
import type { IncomeStatementAccountRow, IncomeStatementCell } from "@/lib/report/types";
import { COLORS } from "./colors";

export type OnEditIncomeCell = (itemId: string, newAmount: number) => Promise<void>;

interface IncomeStatementTableProps {
  major: IncomeStatementAccountRow[];
  detail: IncomeStatementAccountRow[];
  onEditCell?: OnEditIncomeCell;
  /** 제공되면 1~lastMonth까지만 표시하고 "N월까지 누계"로 제목/합계를 계산한다.
   * 없거나 12면 기존처럼 12개월 전체를 보여준다(하위 호환). */
  baseYear?: number;
  lastMonth?: number;
}

function sumCellsThrough(cells: IncomeStatementCell[], throughMonth: number): number {
  return cells.slice(0, throughMonth).reduce((s, c) => s + c.amount, 0);
}

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

function EditableCell({ cell, onEditCell }: { cell: IncomeStatementCell; onEditCell?: OnEditIncomeCell }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(cell.amount));
  const [isSaving, setIsSaving] = useState(false);

  const editable = Boolean(onEditCell && cell.id);

  async function commit() {
    if (!onEditCell || !cell.id) return;
    const parsed = Number(draft);
    if (Number.isNaN(parsed)) {
      setDraft(String(cell.amount));
      setIsEditing(false);
      return;
    }
    if (parsed === cell.amount) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onEditCell(cell.id, parsed);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <td style={{ ...td, textAlign: "right", padding: "2px 6px" }}>
        <input
          type="number"
          autoFocus
          value={draft}
          disabled={isSaving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(String(cell.amount));
              setIsEditing(false);
            }
          }}
          style={{
            width: 90,
            textAlign: "right",
            fontSize: 12,
            padding: "3px 4px",
            border: `1px solid ${COLORS.profit}`,
            borderRadius: 4,
          }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={() => editable && setIsEditing(true)}
      // 수정 여부 표시(배경색/●)는 고객 화면에도 필요하지만(Phase 4 요구사항),
      // "누가" 수정했는지(담당자 이메일)는 관리자 화면(onEditCell이 있는 경우)
      // 에서만 보여준다 — 고객에게 내부 담당자 이메일을 노출할 이유가 없다.
      title={cell.isEdited && onEditCell ? `관리자 수정: ${cell.editedBy ?? ""} ${cell.editedAt ? formatKstDateTime(cell.editedAt) : ""}` : undefined}
      style={{
        ...td,
        textAlign: "right",
        cursor: editable ? "pointer" : undefined,
        background: cell.isEdited && onEditCell ? "#fff7e6" : undefined,
        position: "relative",
      }}
    >
      {cell.amount === 0 ? "-" : formatNumber(cell.amount)}
      {cell.isEdited && onEditCell && (
        <span style={{ color: "#d97706", fontSize: 10, marginLeft: 3 }}>●</span>
      )}
    </td>
  );
}

function Table({
  rows,
  bold,
  onEditCell,
  visibleMonths,
}: {
  rows: IncomeStatementAccountRow[];
  bold?: boolean;
  onEditCell?: OnEditIncomeCell;
  visibleMonths: number;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            <th style={{ ...th, position: "sticky", left: 0, background: "white" }}>과목</th>
            {Array.from({ length: visibleMonths }, (_, i) => (
              <th key={i} style={{ ...th, textAlign: "right" }}>
                {i + 1}월
              </th>
            ))}
            <th style={{ ...th, textAlign: "right" }}>합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.accountName}>
              <td
                style={{
                  ...td,
                  fontWeight: bold ? 700 : 400,
                  position: "sticky",
                  left: 0,
                  background: "white",
                }}
              >
                {row.accountName}
              </td>
              {row.cells.slice(0, visibleMonths).map((cell, i) => (
                <EditableCell key={i} cell={cell} onEditCell={onEditCell} />
              ))}
              <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                {formatNumber(sumCellsThrough(row.cells, visibleMonths))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryTable({ major, visibleMonths }: { major: IncomeStatementAccountRow[]; visibleMonths: number }) {
  const salesRow = major.find((r) => r.accountName.includes("매출액"));
  const salesTotal = salesRow ? sumCellsThrough(salesRow.cells, visibleMonths) : 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, maxWidth: 480 }}>
        <thead>
          <tr>
            <th style={th}>구분</th>
            <th style={{ ...th, textAlign: "right" }}>금액</th>
            <th style={{ ...th, textAlign: "right" }}>매출 대비</th>
          </tr>
        </thead>
        <tbody>
          {major.map((row) => {
            const amount = sumCellsThrough(row.cells, visibleMonths);
            const ratio = salesTotal !== 0 ? (amount / salesTotal) * 100 : 0;
            return (
              <tr key={row.accountName}>
                <td style={{ ...td, fontWeight: row.isMajor ? 600 : 400 }}>{row.accountName}</td>
                <td style={{ ...td, textAlign: "right" }}>{formatNumber(amount)}</td>
                <td style={{ ...td, textAlign: "right", color: COLORS.muted }}>{ratio.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function IncomeStatementTable({ major, detail, onEditCell, baseYear, lastMonth }: IncomeStatementTableProps) {
  const visibleMonths = lastMonth && lastMonth > 0 && lastMonth <= 12 ? lastMonth : 12;
  const title =
    baseYear && visibleMonths < 12
      ? `${baseYear}년 1~${visibleMonths}월 누계 손익계산서`
      : baseYear
        ? `${baseYear}년 손익계산서`
        : "손익계산서";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
      {onEditCell && (
        <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
          금액 셀을 클릭하면 수정할 수 있습니다. <span style={{ color: "#d97706" }}>●</span> 표시는 관리자가 수정한 값입니다.
        </p>
      )}
      <SummaryTable major={major} visibleMonths={visibleMonths} />
      <div>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>손익계산서 (대분류)</p>
        <Table rows={major} bold onEditCell={onEditCell} visibleMonths={visibleMonths} />
      </div>
      {detail.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>세부 계정과목</p>
          <Table rows={detail} onEditCell={onEditCell} visibleMonths={visibleMonths} />
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: `2px solid ${COLORS.gridline}`,
  padding: "6px 10px",
  color: COLORS.textSecondary,
};
const td: React.CSSProperties = {
  borderBottom: `1px solid ${COLORS.gridline}`,
  padding: "6px 10px",
  color: COLORS.textPrimary,
};
