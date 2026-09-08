import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadReportViewData } from "@/lib/report/loadReportViewData";
import { buildReportTitle } from "@/lib/report/reportTitle";
import { verifyLinkSessionValue, cookieNameForToken } from "@/lib/publicLink/session";
import { LINK_UNAVAILABLE_MESSAGE, LINK_EXPIRED_MESSAGE } from "@/lib/publicLink/messages";
import { isLinkExpired } from "@/lib/publicLink/expiry";
import { ReportView } from "@/components/report/ReportView";
import { PublicLinkPasswordForm } from "@/components/report/PublicLinkPasswordForm";

export const dynamic = "force-dynamic";

// 비밀번호 인증 전에는 거래처명을 브라우저 탭 제목으로도 노출하지 않는다
// (링크만 보고 어느 고객사의 데이터인지 추측할 수 있는 여지를 없앤다).
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabaseAdminClient();
  const { data: link } = await supabase
    .from("report_links")
    .select("id, report_id, status, expires_at")
    .eq("link_token", token)
    .maybeSingle();
  if (!link || link.status !== "active" || isLinkExpired(link.expires_at)) return { title: "재무보고서 열람" };

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(cookieNameForToken())?.value;
  if (!verifyLinkSessionValue(sessionCookie, link.id)) return { title: "재무보고서 열람" };

  const result = await loadReportViewData(link.report_id);
  if (!result.ok) return { title: "재무보고서 열람" };
  return { title: `${result.data.client.companyName} ${buildReportTitle(result.data.report.reportMonth)}` };
}

function MessageScreen({ message }: { message: string }) {
  return (
    <main style={{ maxWidth: 420, margin: "120px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <p style={{ fontSize: 15, textAlign: "center", color: "#333" }}>{message}</p>
    </main>
  );
}

export default async function CustomerReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: link, error: linkError } = await supabase
    .from("report_links")
    .select("id, report_id, status, expires_at")
    .eq("link_token", token)
    .maybeSingle();

  if (linkError) {
    return <MessageScreen message="일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." />;
  }
  if (!link) {
    return <MessageScreen message="존재하지 않는 링크입니다." />;
  }
  // 폐기된 링크는 비밀번호 입력창조차 보여주지 않는다 — 비밀번호를 맞혀도
  // 다시 사용할 수 없어야 하므로, 애초에 검증 시도 자체를 막는다.
  if (link.status !== "active") {
    return <MessageScreen message={LINK_UNAVAILABLE_MESSAGE} />;
  }
  // 60일 만료도 같은 이유로 비밀번호 검증 시도 전에 차단한다 (status는 active로
  // 남아있어도 기간이 지났으면 열람 불가).
  if (isLinkExpired(link.expires_at)) {
    return <MessageScreen message={LINK_EXPIRED_MESSAGE} />;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(cookieNameForToken())?.value;
  const isAuthenticated = verifyLinkSessionValue(sessionCookie, link.id);

  if (!isAuthenticated) {
    return <PublicLinkPasswordForm token={token} />;
  }

  const result = await loadReportViewData(link.report_id);
  if (!result.ok) {
    return <MessageScreen message="보고서를 불러오지 못했습니다. 발급처에 문의해주세요." />;
  }

  // onEditIncomeCell/onEditNote를 전달하지 않으므로 자동으로 읽기 전용 화면이 된다.
  return (
    <main style={{ padding: "24px 16px" }}>
      <ReportView {...result.data} />
    </main>
  );
}
