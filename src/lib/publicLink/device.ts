/**
 * 고객 공유 링크는 PC(데스크톱) 환경에서만 열람하도록 제한한다.
 * User-Agent 문자열은 클라이언트가 임의로 조작할 수 있으므로 이 검사는
 * 접근 제어(보안) 목적이 아니라, 의도치 않은 모바일 열람을 막기 위한
 * UX 차원의 안내 화면이다. 실제 데이터 보호는 비밀번호 인증에 의존한다.
 */
export function isMobileUserAgent(userAgent: string): boolean {
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|BlackBerry/i.test(userAgent);
}
