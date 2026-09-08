/**
 * 기준월(report_month)을 기반으로 리포트 제목/파일명을 만든다. 기존(월 개념이
 * 없던 시절) 리포트는 report_month가 null이므로, 그 경우 예전과 동일하게
 * 월 표기 없는 제목을 반환해 하위 호환을 유지한다.
 */
export function buildReportTitle(reportMonth: number | null): string {
  return reportMonth ? `${reportMonth}월 재무보고서` : "재무보고서";
}

const FORBIDDEN_FILENAME_CHARS = /[\\/:*?"<>|]/g;

/** 파일 저장 시 문제가 되는 문자를 제거하고 공백은 밑줄로 바꾼다. */
function sanitizeForFilename(value: string): string {
  return value.replace(FORBIDDEN_FILENAME_CHARS, "").trim().replace(/\s+/g, "_");
}

export function buildReportFilename(companyName: string, baseYear: number, reportMonth: number | null): string {
  const safeCompany = sanitizeForFilename(companyName) || "거래처";
  return reportMonth
    ? `${safeCompany}_${baseYear}년_${reportMonth}월_재무보고서`
    : `${safeCompany}_${baseYear}년_재무보고서`;
}
