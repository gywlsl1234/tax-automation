import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatKstDateTime } from "@/lib/formatDate";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const supabase = getSupabaseAdminClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, company_name, ceo_name, biz_reg_no, created_at, reports(id, base_year, compare_year, status, created_at)"
    )
    .order("created_at", { ascending: false });

  clients?.forEach((c) => {
    c.reports?.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>고객사 목록</h1>
      <p style={{ marginBottom: 24, display: "flex", gap: 16 }}>
        <Link href="/admin">← 대시보드로</Link>
        <Link href="/admin/clients/bulk-upload">거래처 일괄 업로드</Link>
      </p>

      {error && <p style={{ color: "crimson" }}>조회 실패: {error.message}</p>}

      {!error && (!clients || clients.length === 0) && <p>등록된 고객사가 없습니다.</p>}

      {!error && clients && clients.length > 0 && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>상호</th>
              <th style={th}>대표자</th>
              <th style={th}>사업자등록번호</th>
              <th style={th}>보고서</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td style={td}>
                  <Link href={`/admin/clients/${c.id}`} style={{ color: "#2563eb" }}>
                    {c.company_name}
                  </Link>
                </td>
                <td style={td}>{c.ceo_name}</td>
                <td style={td}>{c.biz_reg_no}</td>
                <td style={td}>
                  {(c.reports ?? []).length === 0 ? (
                    "없음"
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {c.reports.map((r, idx) => (
                        <li key={r.id} style={{ marginBottom: 4 }}>
                          <Link href={`/admin/reports/${r.id}/preview`} style={{ color: "#2563eb" }}>
                            {r.base_year}년({r.status})
                            {r.compare_year ? ` · 비교연도 ${r.compare_year}` : " · 비교연도 없음"}
                            {idx === 0 && " (최신)"}
                          </Link>
                          <span style={{ color: "#999", marginLeft: 6 }}>
                            {formatKstDateTime(r.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #e5e7eb",
  padding: "6px 8px",
  fontSize: 13,
  color: "#555",
};
const td: React.CSSProperties = { borderBottom: "1px solid #f0f0f0", padding: "6px 8px", fontSize: 13 };
