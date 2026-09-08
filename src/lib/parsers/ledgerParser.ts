import type ExcelJS from "exceljs";
import type { LedgerEntryType, ParsedLedgerEntry } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface ColumnMap {
  구분: number;
  전표일자: number;
  번호: number;
  거래처: number;
  사업자번호: number;
  품명: number;
  공급가액: number;
  부가세: number;
  합계: number;
  계정과목: number;
  카드사명: number;
  카드번호: number;
}

function normalizeHeader(text: string): string {
  return text.replace(/\s+/g, "");
}

function findColumn(headerRow: ExcelJS.Row, columnCount: number, name: string): number {
  for (let c = 1; c <= columnCount; c++) {
    if (normalizeHeader(headerRow.getCell(c).text) === name) {
      return c;
    }
  }
  throw new Error(`매입/매출장 헤더에서 "${name}" 컬럼을 찾을 수 없습니다.`);
}

function buildColumnMap(sheet: ExcelJS.Worksheet): ColumnMap {
  const headerRow = sheet.getRow(1);
  const cc = sheet.columnCount;
  return {
    구분: findColumn(headerRow, cc, "구분"),
    전표일자: findColumn(headerRow, cc, "전표일자"),
    번호: findColumn(headerRow, cc, "번호"),
    거래처: findColumn(headerRow, cc, "거래처"),
    사업자번호: findColumn(headerRow, cc, "사업자(주민)번호"),
    품명: findColumn(headerRow, cc, "품명"),
    공급가액: findColumn(headerRow, cc, "공급가액"),
    부가세: findColumn(headerRow, cc, "부가세"),
    합계: findColumn(headerRow, cc, "합계"),
    계정과목: findColumn(headerRow, cc, "계정과목"),
    카드사명: findColumn(headerRow, cc, "카드사명"),
    카드번호: findColumn(headerRow, cc, "카드번호"),
  };
}

function toNullableString(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

function toNullableNumber(cell: ExcelJS.Cell): number | null {
  const raw = cell.value;
  if (typeof raw === "number") return raw;
  const text = cell.text.replace(/,/g, "").trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isNaN(n) ? null : n;
}

/**
 * 월별 매입/매출장 파서 (작업지시서 4-3).
 * "전표일자"가 YYYY-MM-DD 형식이 아닌 행(합 계/월 계/누 계 등 요약행)은 건너뛴다.
 * "구분" 컬럼 값(매출/매입)을 그대로 entry_type으로 사용하므로, 매입/매출이 한 파일에
 * 섞여 있든 파일이 분리되어 있든 상관없이 정확히 분류된다.
 */
export function parseLedgerSheet(sheet: ExcelJS.Worksheet): ParsedLedgerEntry[] {
  const columns = buildColumnMap(sheet);
  const entries: ParsedLedgerEntry[] = [];

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const entryDate = row.getCell(columns.전표일자).text.trim();
    if (!DATE_PATTERN.test(entryDate)) continue; // 요약행 스킵

    const entryTypeRaw = row.getCell(columns.구분).text.trim();
    if (entryTypeRaw !== "매출" && entryTypeRaw !== "매입") continue;
    const entryType = entryTypeRaw as LedgerEntryType;

    entries.push({
      year: Number(entryDate.slice(0, 4)),
      entryType,
      entryDate,
      entryNo: toNullableString(row.getCell(columns.번호).text),
      vendor: toNullableString(row.getCell(columns.거래처).text),
      vendorRegNo: toNullableString(row.getCell(columns.사업자번호).text),
      itemName: toNullableString(row.getCell(columns.품명).text),
      supplyAmount: toNullableNumber(row.getCell(columns.공급가액)),
      vatAmount: toNullableNumber(row.getCell(columns.부가세)),
      totalAmount: toNullableNumber(row.getCell(columns.합계)),
      accountName: toNullableString(row.getCell(columns.계정과목).text),
      cardCompany: toNullableString(row.getCell(columns.카드사명).text),
      cardNumber: toNullableString(row.getCell(columns.카드번호).text),
    });
  }

  return entries;
}
