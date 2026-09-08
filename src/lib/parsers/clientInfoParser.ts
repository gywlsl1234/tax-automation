import type ExcelJS from "exceljs";
import type { ParsedClientInfo, ParsedReportSettings } from "./types";

/**
 * "0_사업자정보_보고서설정_입력양식.xlsx" 파서.
 * A열 = 라벨, B열 = 값. 행 번호가 아니라 A열 텍스트로 값을 찾는다(작업지시서 4-1).
 * 사용자가 안내문 행을 지우거나 순서를 바꿔도 라벨만 일치하면 깨지지 않는다.
 */
function buildLabelMap(sheet: ExcelJS.Worksheet): Map<string, string> {
  const map = new Map<string, string>();
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const label = row.getCell(1).text.trim();
    if (!label) continue;
    const value = row.getCell(2).text.trim();
    // 같은 라벨이 여러 번 나오면 처음(위에 있는) 값을 우선한다.
    if (!map.has(label)) {
      map.set(label, value);
    }
  }
  return map;
}

/** patterns를 순서대로 검사해 먼저 매치되는 라벨의 값을 반환한다 (더 구체적인 패턴을 앞에 둘 것). */
function findByLabel(
  map: Map<string, string>,
  patterns: { includes?: string[]; excludes?: string[] }[]
): string | null {
  for (const { includes = [], excludes = [] } of patterns) {
    for (const [label, value] of map) {
      const matchesIncludes = includes.every((p) => label.includes(p));
      const matchesExcludes = excludes.every((p) => !label.includes(p));
      if (matchesIncludes && matchesExcludes) {
        return value;
      }
    }
  }
  return null;
}

function toNullableString(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseFiscalMonth(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\d{1,2}/);
  if (!match) return null;
  const month = Number(match[0]);
  return month >= 1 && month <= 12 ? month : null;
}

function parseYear(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function parseYN(value: string | null): boolean {
  if (!value) return false;
  return value.trim().toUpperCase().startsWith("Y");
}

function parseIntOrNull(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

export function parseClientInfoSheet(sheet: ExcelJS.Worksheet): ParsedClientInfo {
  const map = buildLabelMap(sheet);

  const companyName = findByLabel(map, [{ includes: ["상호"] }]);
  const ceoName = findByLabel(map, [{ includes: ["대표자명"] }]);
  const bizRegNo = findByLabel(map, [{ includes: ["사업자등록번호"] }]);

  if (!companyName || !ceoName || !bizRegNo) {
    throw new Error(
      "사업자정보 시트에서 필수 항목(상호, 대표자명, 사업자등록번호)을 찾을 수 없습니다."
    );
  }

  return {
    companyName,
    ceoName,
    bizRegNo,
    bizType: toNullableString(findByLabel(map, [{ includes: ["업태"] }])),
    bizItem: toNullableString(findByLabel(map, [{ includes: ["종목"] }])),
    openDate: toNullableString(findByLabel(map, [{ includes: ["개업일자"] }])),
    address: toNullableString(findByLabel(map, [{ includes: ["소재지"] }])),
    phone: toNullableString(findByLabel(map, [{ includes: ["연락처"] }])),
    email: toNullableString(findByLabel(map, [{ includes: ["이메일"] }])),
    fiscalMonth: parseFiscalMonth(findByLabel(map, [{ includes: ["결산월"] }])),
    accountingFirm: toNullableString(
      findByLabel(map, [{ includes: ["회계"], excludes: ["세무사"] }, { includes: ["세무"] }])
    ),
    accountantName: toNullableString(findByLabel(map, [{ includes: ["담당 세무사"] }, { includes: ["담당 회계사"] }])),
  };
}

export function parseReportSettingsSheet(sheet: ExcelJS.Worksheet): ParsedReportSettings {
  const map = buildLabelMap(sheet);

  const baseYear = parseYear(findByLabel(map, [{ includes: ["기준연도"] }]));
  if (!baseYear) {
    throw new Error("보고서설정 시트에서 기준연도를 찾을 수 없습니다.");
  }

  return {
    baseYear,
    compareYear: parseYear(findByLabel(map, [{ includes: ["비교연도"] }])),
    currencyUnit: findByLabel(map, [{ includes: ["통화 단위"] }]) ?? "원",
    publicDays: parseIntOrNull(findByLabel(map, [{ includes: ["공개기간"] }])),
    usePassword: parseYN(findByLabel(map, [{ includes: ["비밀번호", "사용 여부"] }])),
    password: toNullableString(
      findByLabel(map, [
        { includes: ["비밀번호"], excludes: ["사용 여부"] },
      ])
    ),
    logoFileName: toNullableString(findByLabel(map, [{ includes: ["로고"] }])),
    publisherName: toNullableString(findByLabel(map, [{ includes: ["발행 담당자"] }])),
    customerNotice: toNullableString(findByLabel(map, [{ includes: ["안내 문구"] }])),
  };
}
