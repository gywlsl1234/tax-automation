import type { VendorTotal } from "@/lib/report/aggregate";
import { COLORS } from "./colors";
import { ResponsiveTable } from "./ResponsiveTable";

interface VendorTableProps {
  title: string;
  vendors: VendorTotal[];
}

export function VendorTable({ title, vendors }: VendorTableProps) {
  return (
    <div>
      <p style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 }}>{title}</p>
      <ResponsiveTable
        rows={vendors}
        getKey={(v) => v.vendor}
        emptyText="데이터가 없습니다."
        columns={[
          { label: "거래처", render: (v) => v.vendor, isCardTitle: true },
          { label: "건수", align: "right", render: (v) => `${v.count}건` },
          { label: "합계", align: "right", render: (v) => `${v.totalAmount.toLocaleString("ko-KR")}원` },
        ]}
      />
    </div>
  );
}
