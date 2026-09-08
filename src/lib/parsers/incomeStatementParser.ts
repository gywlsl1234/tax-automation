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

function normalize(text: string): string {
  return text.replace(/\s+/g, "");
}

/**
 * 기간별(월별) 손익계산서 파서 (작업지시서 4-2 + "당기/전기 비교" 확장 양식 지원).
 *
 * 두 가지 헤더 형식을 자동 감지한다.
 *  1) 기본 형식(1행 헤더): "YYYY년MM월" 컬럼이 그대로 해당 연도/월의 데이터.
 *  2) 당기/전기 비교 형식(2행 헤더): 1행에 "YYYY년MM월"이 두 번씩 짝지어 나오고,
 *     2행에서 그 짝을 "당기"/"전기"로 구분한다. "전기" 컬럼은 1행에 표기된 연도의
 *     실제 데이터가 아니라 그 전년도(연도-1) 데이터를 의미한다.
 *     예: 1행 "2026년01월"+2행 "전기" => 실제로는 2025년 1월 데이터.
 *  "합계"류 컬럼(1행이 "합 계"/"합계" 등)은 연/월 패턴이 아니므로 자동으로 제외된다.
 */
export function parseIncomeStatementSheet(sheet: ExcelJS.Worksheet): ParsedIncomeStatementItem[] {
  const row1 = sheet.getRow(1);
  const row2 = sheet.getRow(2);

  let hasPeriodTagRow = false;
  for (let c = 1; c <= sheet.columnCount; c++) {
    const tag = normalize(row2.getCell(c).text);
    if (tag === "당기" || tag === "전기") {
      hasPeriodTagRow = true;
      break;
    }
  }

  const monthColumns: MonthColumn[] = [];
  for (let c = 1; c <= sheet.columnCount; c++) {
    const headerText = normalize(row1.getCell(c).text);
    const match = headerText.match(MONTH_HEADER_PATTERN);
    if (!match) continue;

    if (hasPeriodTagRow) {
      const tag = normalize(row2.getCell(c).text);
      if (tag !== "당기" && tag !== "전기") continue;
      const labeledYear = Number(match[1]);
      const year = tag === "당기" ? labeledYear : labeledYear - 1;
      monthColumns.push({ columnIndex: c, year, month: Number(match[2]) });
    } else {
      monthColumns.push({ columnIndex: c, year: Number(match[1]), month: Number(match[2]) });
    }
  }

  if (monthColumns.length === 0) {
    throw new Error('손익계산서 헤더에서 "YYYY년MM월" 형식의 월별 컬럼을 찾을 수 없습니다.');
  }

  const dataStartRow = hasPeriodTagRow ? 3 : 2;
  const items: ParsedIncomeStatementItem[] = [];
  for (let r = dataStartRow; r <= sheet.rowCount; r++) {
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
