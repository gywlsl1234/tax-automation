import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadReportViewData } from "@/lib/report/loadReportViewData";
import { buildReportTitle } from "@/lib/report/reportTitle";
import { AdminReportPreview } from "@/components/report/AdminReportPreview";
import { ReportLinkPanel } from "@/components/admin/ReportLinkPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const result = await loadReportViewData(reportId);
  if (!result.ok) return { title: "보고서 미리보기" };
  return { title: `${result.data.client.companyName} ${buildReportTitle(result.data.report.reportMonth)} (미리보기)` };
}

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reportId } = await params;

  const result = await loadReportViewData(reportId);
  if (!result.ok) {
    return (
      <main style={{ maxWidth: 640, margin: "80px auto", fontFamily: "sans-serif" }}>
        <p style={{ color: "crimson" }}>{result.error}</p>
      </main>
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: reportLinks } = await supabase
    .from("report_links")
    .select("id, link_token, status, fail_count, created_at, revoked_at, expires_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: "24px 16px" }}>
      <p style={{ maxWidth: 960, margin: "0 auto 16px" }}>
        <Link href="/admin/clients">← 고객사 목록으로</Link>
      </p>
      <div style={{ maxWidth: 960, margin: "0 auto 24px" }}>
        <ReportLinkPanel
          reportId={reportId}
          initialLinks={(reportLinks ?? []).map((l) => ({
            id: l.id,
            linkToken: l.link_token,
            status: l.status as "active" | "revoked",
            failCount: l.fail_count,
            createdAt: l.created_at,
            revokedAt: l.revoked_at,
            expiresAt: l.expires_at,
          }))}
        />
      </div>
      <AdminReportPreview {...result.data} reportId={reportId} />
    </main>
  );
}
