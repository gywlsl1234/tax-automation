import type { VendorTotal } from "@/lib/report/aggregate";
import { COLORS } from "./colors";

interface VendorTableProps {
  title: string;
  vendors: VendorTotal[];
}

export function VendorTable({ title, vendors }: VendorTableProps) {
  return (
    <div>
      <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>{title}</p>
      {vendors.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>데이터가 없습니다.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>거래처</th>
              <th style={{ ...th, textAlign: "right" }}>건수</th>
              <th style={{ ...th, textAlign: "right" }}>합계</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.vendor}>
                <td style={td}>{v.vendor}</td>
                <td style={{ ...td, textAlign: "right" }}>{v.count}건</td>
                <td style={{ ...td, textAlign: "right" }}>{v.totalAmount.toLocaleString("ko-KR")}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: `2px solid ${COLORS.gridline}`,
  padding: "6px 8px",
  fontSize: 12,
  color: COLORS.textSecondary,
};
const td: React.CSSProperties = {
  borderBottom: `1px solid ${COLORS.gridline}`,
  padding: "6px 8px",
  fontSize: 13,
  color: COLORS.textPrimary,
};
