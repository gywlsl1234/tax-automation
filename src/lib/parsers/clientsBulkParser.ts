import type ExcelJS from "exceljs";
import type { ParsedClientBulkRow, ParseIssue } from "./types";

/** 헤더 라벨 → 데이터 시작 여부와 무관하게, 값이 있는 첫 번째 열을 찾는다. */
const HEADERS = {
  companyName: ["거래처명", "상호"],
  ceoName: ["대표자명", "대표자"],
  bizRegNo: ["사업자등록번호"],
  entityType: ["사업자구분", "구분"],
  bizType: ["업태"],
  bizItem: ["종목"],
  contactName: ["담당자명", "담당자"],
  phone: ["연락처", "전화번호"],
  email: ["이메일"],
  address: ["소재지", "주소"],
  fiscalMonth: ["결산월"],
} as const;

type FieldKey = keyof typeof HEADERS;

function buildColumnMap(headerRow: ExcelJS.Row): Partial<Record<FieldKey, number>> {
  const map: Partial<Record<FieldKey, number>> = {};
  const colCount = headerRow.cellCount;
  for (let c = 1; c <= colCount; c++) {
    const label = headerRow.getCell(c).text.trim();
    if (!label) continue;
    for (const key of Object.keys(HEADERS) as FieldKey[]) {
      if (map[key] !== undefined) continue;
      if (HEADERS[key].some((candidate) => label.includes(candidate))) {
        map[key] = c;
      }
    }
  }
  return map;
}

function cellText(row: ExcelJS.Row, col: number | undefined): string {
  if (!col) return "";
  return row.getCell(col).text.trim();
}

function parseEntityType(raw: string): "individual" | "corporate" {
  const normalized = raw.trim();
  if (normalized.includes("법인")) return "corporate";
  return "individual"; // 미기재/개인 등은 기본값(individual)
}

function parseFiscalMonth(raw: string): number | null {
  const match = raw.match(/\d{1,2}/);
  if (!match) return null;
  const month = Number(match[0]);
  return month >= 1 && month <= 12 ? month : null;
}

const BIZ_REG_NO_DIGITS = /^\d{10}$/;

/**
 * 거래처 일괄 업로드 시트 파서. 1행 = 헤더, 2행부터 데이터.
 * 필수값(거래처명/대표자명/사업자등록번호)이 없거나 사업자등록번호 형식이 맞지
 * 않는 행은 건너뛰고 issues에 사유를 남긴다 — 한 행의 오류가 나머지 행 처리를
 * 막지 않는다(작업지시서: "오류 건수/오류가 발생한 행 및 사유" 요구사항).
 */
export function parseClientsBulkSheet(sheet: ExcelJS.Worksheet): {
  rows: ParsedClientBulkRow[];
  issues: ParseIssue[];
} {
  const rows: ParsedClientBulkRow[] = [];
  const issues: ParseIssue[] = [];

  const headerRow = sheet.getRow(1);
  const columns = buildColumnMap(headerRow);
  if (!columns.companyName || !columns.ceoName || !columns.bizRegNo) {
    issues.push({
      row: 1,
      message: '헤더 행에서 필수 컬럼(거래처명, 대표자명, 사업자등록번호)을 찾을 수 없습니다.',
    });
    return { rows, issues };
  }

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const companyName = cellText(row, columns.companyName);
    const ceoName = cellText(row, columns.ceoName);
    const bizRegNoRaw = cellText(row, columns.bizRegNo);
    if (!companyName && !ceoName && !bizRegNoRaw) continue; // 완전히 빈 행은 조용히 건너뛴다

    const bizRegNoDigits = bizRegNoRaw.replace(/\D/g, "");
    if (!companyName || !ceoName || !bizRegNoRaw) {
      issues.push({ row: r, message: "거래처명, 대표자명, 사업자등록번호는 필수입니다." });
      continue;
    }
    if (!BIZ_REG_NO_DIGITS.test(bizRegNoDigits)) {
      issues.push({ row: r, message: `사업자등록번호 형식이 올바르지 않습니다: "${bizRegNoRaw}"` });
      continue;
    }

    rows.push({
      row: r,
      companyName,
      ceoName,
      bizRegNo: bizRegNoRaw,
      entityType: parseEntityType(cellText(row, columns.entityType)),
      bizType: cellText(row, columns.bizType) || null,
      bizItem: cellText(row, columns.bizItem) || null,
      contactName: cellText(row, columns.contactName) || null,
      phone: cellText(row, columns.phone) || null,
      email: cellText(row, columns.email) || null,
      address: cellText(row, columns.address) || null,
      fiscalMonth: parseFiscalMonth(cellText(row, columns.fiscalMonth)),
    });
  }

  return { rows, issues };
}
