import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 고객 공유 링크 발급/재발급.
 * - 기존 활성 링크가 있으면 revoked로 바꾸고, 새 링크를 발급한다
 *   (report_links의 "활성 링크는 보고서당 1개" 유니크 인덱스와도 정합적).
 * - 기본 비밀번호는 사업자등록번호 뒤 5자리(숫자만 추출)로 자동 생성한다.
 * - 비밀번호 원문은 응답에 한 번만 담아 관리자에게 보여주고, DB에는 bcrypt
 *   해시만 저장한다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reportId } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, client_id")
    .eq("id", reportId)
    .single();
  if (reportError || !report) {
    return NextResponse.json({ error: "보고서를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("biz_reg_no")
    .eq("id", report.client_id)
    .single();
  if (clientError || !client) {
    return NextResponse.json({ error: "고객사 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const digitsOnly = client.biz_reg_no.replace(/\D/g, "");
  if (digitsOnly.length < 5) {
    return NextResponse.json(
      { error: "사업자등록번호에서 기본 비밀번호를 만들 수 없습니다 (숫자 5자리 미만)." },
      { status: 400 }
    );
  }
  const defaultPassword = digitsOnly.slice(-5);

  // 기존 활성 링크를 폐기한다. (한 보고서에 활성 링크는 항상 1개 이하로 유지)
  const { error: revokeError } = await supabase
    .from("report_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("report_id", reportId)
    .eq("status", "active");
  if (revokeError) {
    return NextResponse.json({ error: `기존 링크 폐기 실패: ${revokeError.message}` }, { status: 500 });
  }

  const linkToken = randomBytes(24).toString("base64url"); // 32자, URL-safe
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const { data: newLink, error: insertError } = await supabase
    .from("report_links")
    .insert({
      report_id: reportId,
      link_token: linkToken,
      password_hash: passwordHash,
      status: "active",
      fail_count: 0,
    })
    .select("id, link_token, created_at")
    .single();
  if (insertError || !newLink) {
    return NextResponse.json({ error: `링크 발급 실패: ${insertError?.message}` }, { status: 500 });
  }

  await supabase
    .from("reports")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", reportId);

  const origin = new URL(request.url).origin;

  return NextResponse.json({
    linkToken: newLink.link_token,
    url: `${origin}/r/${newLink.link_token}`,
    defaultPassword,
    createdAt: newLink.created_at,
  });
}
