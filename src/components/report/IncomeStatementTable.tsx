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
        background: cell.isEdited ? "#fff7e6" : undefined,
        position: "relative",
      }}
    >
      {cell.amount === 0 ? "-" : formatNumber(cell.amount)}
      {cell.isEdited && (
        <span style={{ color: "#d97706", fontSize: 10, marginLeft: 3 }}>●</span>
      )}
    </td>
  );
}

function Table({
  rows,
  bold,
  onEditCell,
}: {
  rows: IncomeStatementAccountRow[];
  bold?: boolean;
  onEditCell?: OnEditIncomeCell;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            <th style={{ ...th, position: "sticky", left: 0, background: "white" }}>과목</th>
            {Array.from({ length: 12 }, (_, i) => (
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
              {row.cells.map((cell, i) => (
                <EditableCell key={i} cell={cell} onEditCell={onEditCell} />
              ))}
              <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{formatNumber(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IncomeStatementTable({ major, detail, onEditCell }: IncomeStatementTableProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {onEditCell && (
        <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
          금액 셀을 클릭하면 수정할 수 있습니다. <span style={{ color: "#d97706" }}>●</span> 표시는 관리자가 수정한 값입니다.
        </p>
      )}
      <div>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>손익계산서 (대분류)</p>
        <Table rows={major} bold onEditCell={onEditCell} />
      </div>
      {detail.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>세부 계정과목</p>
          <Table rows={detail} onEditCell={onEditCell} />
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
