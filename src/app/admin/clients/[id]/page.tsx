import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ClientReportsPanel } from "@/components/admin/ClientReportsPanel";
import { VatPeriodTypeSetting } from "@/components/admin/VatPeriodTypeSetting";

export const dynamic = "force-dynamic";

const ENTITY_TYPE_LABEL: Record<string, string> = {
  individual: "개인사업자",
  corporate: "법인사업자",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(
      "id, company_name, ceo_name, biz_reg_no, entity_type, biz_type, biz_item, contact_name, phone, email, address, vat_period_type"
    )
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !client) {
    return (
      <main style={{ maxWidth: 640, margin: "80px auto", fontFamily: "sans-serif" }}>
        <p style={{ color: "crimson" }}>거래처를 찾을 수 없습니다.</p>
      </main>
    );
  }

  const { data: reports } = await supabase
    .from("reports")
    .select("id, base_year, report_month, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/admin/clients">← 고객사 목록으로</Link>
      </p>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>{client.company_name}</h1>

      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 32 }}>
        <tbody>
          <tr>
            <td style={tdLabel}>대표자</td>
            <td style={td}>{client.ceo_name}</td>
          </tr>
          <tr>
            <td style={tdLabel}>사업자등록번호</td>
            <td style={td}>{client.biz_reg_no}</td>
          </tr>
          <tr>
            <td style={tdLabel}>사업자 구분</td>
            <td style={td}>{ENTITY_TYPE_LABEL[client.entity_type] ?? client.entity_type}</td>
          </tr>
          <tr>
            <td style={tdLabel}>업태 / 종목</td>
            <td style={td}>
              {client.biz_type ?? "-"} / {client.biz_item ?? "-"}
            </td>
          </tr>
          <tr>
            <td style={tdLabel}>담당자</td>
            <td style={td}>{client.contact_name ?? "-"}</td>
          </tr>
          <tr>
            <td style={tdLabel}>연락처 / 이메일</td>
            <td style={td}>
              {client.phone ?? "-"} / {client.email ?? "-"}
            </td>
          </tr>
          <tr>
            <td style={tdLabel}>소재지</td>
            <td style={td}>{client.address ?? "-"}</td>
          </tr>
          <tr>
            <td style={tdLabel}>부가세 신고주기</td>
            <td style={td}>
              <VatPeriodTypeSetting
                clientId={client.id}
                initialValue={(client.vat_period_type as "semiannual" | "quarterly") ?? "semiannual"}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>월별 리포트</h2>
        <Link href="/admin/reports/new" style={{ fontSize: 13, color: "#2563eb" }}>
          새 월 데이터 업로드 →
        </Link>
      </div>
      <ClientReportsPanel
        initialReports={(reports ?? []).map((r) => ({
          id: r.id,
          baseYear: r.base_year,
          reportMonth: r.report_month,
          status: r.status,
          createdAt: r.created_at,
        }))}
      />
    </main>
  );
}

const td: React.CSSProperties = { borderBottom: "1px solid #f0f0f0", padding: "6px 8px", fontSize: 13 };
const tdLabel: React.CSSProperties = { ...td, color: "#555", width: 160 };
