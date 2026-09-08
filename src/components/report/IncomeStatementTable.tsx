import type { IncomeStatementAccountRow } from "@/lib/report/types";
import { COLORS } from "./colors";

interface IncomeStatementTableProps {
  major: IncomeStatementAccountRow[];
  detail: IncomeStatementAccountRow[];
}

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

function Table({ rows, bold }: { rows: IncomeStatementAccountRow[]; bold?: boolean }) {
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
              {row.monthly.map((v, i) => (
                <td key={i} style={{ ...td, textAlign: "right" }}>
                  {v === 0 ? "-" : formatNumber(v)}
                </td>
              ))}
              <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{formatNumber(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IncomeStatementTable({ major, detail }: IncomeStatementTableProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>손익계산서 (대분류)</p>
        <Table rows={major} bold />
      </div>
      {detail.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>세부 계정과목</p>
          <Table rows={detail} />
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
