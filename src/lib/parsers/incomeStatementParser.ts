import type ExcelJS from "exceljs";
import type { ParsedIncomeStatementItem } from "./types";

const MONTH_HEADER_PATTERN = /(\d{4})년\s*(\d{2})월/;
// 로마숫자 대분류 접두어 (Ⅰ~Ⅹ, U+2160~U+2169)
const MAJOR_CATEGORY_PATTERN = /^[Ⅰ-Ⅹ]/;

interface MonthColumn {
  columnIndex: number;
  year: number;
  month: number;
}

/**
 * 기간별(월별) 손익계산서 파서 (작업지시서 4-2).
 * 1행 헤더에서 "YYYY년MM월" 패턴을 정규식으로 찾아 연/월 컬럼을 추출하고,
 * 그 외 헤더(과목, 합계 등)는 무시한다. 로마숫자로 시작하는 행은 대분류로 표시한다.
 */
export function parseIncomeStatementSheet(sheet: ExcelJS.Worksheet): ParsedIncomeStatementItem[] {
  const headerRow = sheet.getRow(1);
  const monthColumns: MonthColumn[] = [];
  for (let c = 1; c <= sheet.columnCount; c++) {
    const headerText = headerRow.getCell(c).text.replace(/\s+/g, "");
    const match = headerText.match(MONTH_HEADER_PATTERN);
    if (match) {
      monthColumns.push({ columnIndex: c, year: Number(match[1]), month: Number(match[2]) });
    }
  }

  if (monthColumns.length === 0) {
    throw new Error('손익계산서 헤더에서 "YYYY년MM월" 형식의 월별 컬럼을 찾을 수 없습니다.');
  }

  const items: ParsedIncomeStatementItem[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const accountName = row.getCell(1).text.trim();
    if (!accountName) continue;

    const isMajorCategory = MAJOR_CATEGORY_PATTERN.test(accountName);

    for (const { columnIndex, year, month } of monthColumns) {
      const cell = row.getCell(columnIndex);
      const raw = cell.value;
      const amount = typeof raw === "number" ? raw : Number(cell.text.replace(/,/g, ""));
      if (Number.isNaN(amount)) continue;

      items.push({ year, accountName, month, amount, isMajorCategory });
    }
  }

  return items;
}
