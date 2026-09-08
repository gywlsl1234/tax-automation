import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLinkSessionValue, cookieNameForToken } from "@/lib/publicLink/session";
import { LINK_UNAVAILABLE_MESSAGE, LINK_EXPIRED_MESSAGE, MAX_PASSWORD_FAILS } from "@/lib/publicLink/messages";
import { isLinkExpired } from "@/lib/publicLink/expiry";

/**
 * 고객 링크 비밀번호 검증. 절대 클라이언트에서 비교하지 않고 서버(이 라우트)
 * 에서만 bcrypt.compare로 검증한다. 실패 횟수는 DB의 report_links.fail_count
 * 로 관리하므로 브라우저를 바꾸거나 새로고침해도 초기화되지 않는다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const supabase = getSupabaseAdminClient();

  const { data: link, error: findError } = await supabase
    .from("report_links")
    .select("id, password_hash, status, expires_at")
    .eq("link_token", token)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
  if (!link || link.status !== "active") {
    // 폐기됐거나 존재하지 않는 링크는 비밀번호가 맞아도 절대 통과시키지 않는다.
    return NextResponse.json({ error: LINK_UNAVAILABLE_MESSAGE, revoked: true }, { status: 403 });
  }
  if (isLinkExpired(link.expires_at)) {
    // 만료된 링크도 비밀번호 시도(및 실패 횟수 증가) 자체를 막는다.
    return NextResponse.json({ error: LINK_EXPIRED_MESSAGE, expired: true }, { status: 403 });
  }

  const isMatch = await bcrypt.compare(password, link.password_hash);

  if (isMatch) {
    const { value, maxAgeSeconds } = createLinkSessionValue(link.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieNameForToken(), value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/r/${token}`,
      maxAge: maxAgeSeconds,
    });
    return response;
  }

  // 실패 횟수 증가는 단일 UPDATE 문(increment_report_link_fail_count)으로
  // DB에서 원자적으로 처리한다 — 동시 요청에도 정확히 세어지고, 5회째에는
  // 같은 트랜잭션에서 즉시 status를 revoked로 바꾼다.
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc("increment_report_link_fail_count", { p_link_id: link.id, p_max_fail: MAX_PASSWORD_FAILS })
    .single<{ new_fail_count: number; new_status: string }>();

  if (rpcError) {
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  if (rpcResult?.new_status === "revoked") {
    return NextResponse.json({ error: LINK_UNAVAILABLE_MESSAGE, revoked: true }, { status: 403 });
  }

  return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
}
