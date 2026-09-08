/**
 * 항상 Asia/Seoul 기준, 24시간제로 날짜/시각을 표시한다.
 * - timeZone을 명시하지 않으면 서버(대개 UTC로 도는 배포 환경)와 클라이언트
 *   (사용자의 로컬 시간대)가 서로 다른 값을 렌더링해 React hydration mismatch가
 *   난다.
 * - 오전/오후(hour12) 표기는 브라우저마다 내장된 국제화(ICU) 데이터가 달라
 *   "오후" vs "PM"처럼 같은 시각도 다른 문자열로 렌더링될 수 있어(이 역시
 *   hydration mismatch 원인) 24시간제로 고정해 아예 피한다.
 */
export function formatKstDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}
