import { cookies, headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadReportViewData } from "@/lib/report/loadReportViewData";
import { verifyLinkSessionValue, cookieNameForToken } from "@/lib/publicLink/session";
import { LINK_UNAVAILABLE_MESSAGE } from "@/lib/publicLink/messages";
import { isMobileUserAgent } from "@/lib/publicLink/device";
import { ReportView } from "@/components/report/ReportView";
import { PublicLinkPasswordForm } from "@/components/report/PublicLinkPasswordForm";

export const dynamic = "force-dynamic";

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
    .select("id, report_id, status")
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

  const userAgent = (await headers()).get("user-agent") ?? "";
  if (isMobileUserAgent(userAgent)) {
    return (
      <MessageScreen message="이 보고서는 모바일 기기에서 열람할 수 없습니다. PC(데스크톱)에서 다시 접속해주세요." />
    );
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
