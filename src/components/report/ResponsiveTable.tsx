import { COLORS } from "./colors";
import styles from "./ResponsiveTable.module.css";

export interface ResponsiveTableColumn<T> {
  label: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  /** 모바일 카드에서는 기본적으로 모든 컬럼을 라벨:값으로 보여주는데,
   * 첫 번째 컬럼(보통 이름)만 카드 제목으로 별도 취급하려면 true로 설정. */
  isCardTitle?: boolean;
}

/**
 * 데스크톱에서는 일반 표, 모바일(640px 이하)에서는 행 하나가 카드 하나로
 * 바뀌는 공용 테이블. PC 표를 그대로 축소하지 않고(작업지시서 15번)
 * "이름 + 나머지는 라벨:값" 카드 형태로 완전히 다르게 그린다.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  getKey,
  emptyText = "데이터가 없습니다.",
}: {
  columns: ResponsiveTableColumn<T>[];
  rows: T[];
  getKey: (row: T) => string;
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <p style={{ fontSize: 13, color: COLORS.muted }}>{emptyText}</p>;
  }

  const titleColumn = columns.find((c) => c.isCardTitle) ?? columns[0];
  const restColumns = columns.filter((c) => c !== titleColumn);

  return (
    <>
      <div className={styles.desktopTable} style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.label} style={{ ...th, textAlign: col.align ?? "left" }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getKey(row)}>
                {columns.map((col) => (
                  <td key={col.label} style={{ ...td, textAlign: col.align ?? "left" }}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileCards} style={{ flexDirection: "column", gap: 8 }}>
        {rows.map((row) => (
          <div key={getKey(row)} style={{ border: `1px solid ${COLORS.gridline}`, borderRadius: 8, padding: 12 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 14 }}>{titleColumn.render(row)}</p>
            {restColumns.map((col) => (
              <p key={col.label} style={{ margin: "2px 0", fontSize: 13, color: COLORS.textSecondary }}>
                {col.label} {col.render(row)}
              </p>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

const th: React.CSSProperties = {
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
