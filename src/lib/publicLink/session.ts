import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 고객 링크(/r/[token]) 비밀번호 인증 후 유지하는 단기 세션 쿠키.
 *
 * NextAuth 세션(관리자용)과는 완전히 별개의 메커니즘이다 — 고객은 계정이 없고
 * 링크+비밀번호로만 인증하므로, 이 쿠키는 "이 브라우저가 방금 이 report_links
 * 행의 비밀번호를 맞혔다"는 사실만 짧게(기본 4시간) 증명한다.
 *
 * 값 형식: `${linkId}.${expUnixSeconds}.${hmacHex}`
 * - HMAC은 NEXTAUTH_SECRET으로 서명해 클라이언트가 linkId/만료시간을 위조하지
 *   못하게 한다.
 * - 쿠키 자체는 Path를 `/r/<token>`으로 제한해서 발급하므로, 다른 보고서
 *   링크로는 재사용되지 않는다(호출부에서 Path를 지정한다).
 */

const SESSION_TTL_SECONDS = 4 * 60 * 60; // 4시간

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createLinkSessionValue(linkId: string): { value: string; maxAgeSeconds: number } {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${linkId}.${exp}`;
  const value = `${payload}.${sign(payload)}`;
  return { value, maxAgeSeconds: SESSION_TTL_SECONDS };
}

/** 쿠키 값이 주어진 linkId에 대해 유효(서명 일치 + 만료 전)한지 검증한다. */
export function verifyLinkSessionValue(cookieValue: string | undefined, expectedLinkId: string): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;
  const [linkId, expStr, sig] = parts;

  if (linkId !== expectedLinkId) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expectedSig = sign(`${linkId}.${expStr}`);
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(sigBuf, expectedBuf);
}

export function cookieNameForToken(): string {
  // 쿠키 이름은 고정, Path로 링크별 스코프를 나눈다(같은 브라우저로 여러
  // 보고서 링크를 열어도 서로 세션이 섞이지 않는다).
  return "rl_session";
}
