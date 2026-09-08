import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * 관리자 화면(/admin/*)과 관리자 API(/api/admin/*)는 세션이 없으면 접근할 수 없다.
 * 고객 열람 경로(/r/[token] 등, Phase 5에서 추가 예정)는 이 proxy의 matcher에
 * 포함되지 않으므로 별도의 토큰 기반 검증 로직으로만 제어된다 — 관리자 인증과
 * 고객 인증 경로를 코드 레벨에서 명확히 분리한다.
 * (Next.js 16부터 이 파일 규칙의 이름이 middleware에서 proxy로 변경되었다.)
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isLoggedIn || isLoginPage) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.nextUrl.origin);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
