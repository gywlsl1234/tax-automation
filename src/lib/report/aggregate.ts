import type {
  IncomeStatementAccountRow,
  IncomeStatementCell,
  IncomeStatementRow,
  LedgerEntryRow,
  LedgerEntryType,
} from "./types";

const MAJOR_CATEGORY_PATTERN = /^[Ⅰ-Ⅹ]/;
const ROMAN_NUMERAL_BASE = 0x2160; // 'Ⅰ'

function majorCategorySortKey(accountName: string): number {
  const code = accountName.codePointAt(0);
  return code !== undefined ? code - ROMAN_NUMERAL_BASE : 999;
}

function detailAccountSortKey(accountName: string): number {
  const match = accountName.match(/^\[(\d+)\]/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * 매출액이 실제로 마감(입력)된 마지막 월을 반환한다.
 *
 * 임차료 같은 고정비는 결산 전에 미리 입력되어 있는 경우가 많아서, "0이 아닌
 * 항목이 하나라도 있는 마지막 달"로 판단하면 매출이 아직 안 잡힌 달까지도
 * "마감됨"으로 착각한다(예: 9월 매출은 0인데 9월 임차료만 미리 입력된 경우).
 * 그래서 매출액(대분류) 행을 기준으로, 그 값이 0이 아닌 마지막 달을 찾는다.
 * "당기가 8월까지만 입력됐는데 전기는 12월까지 있어 합계가 왜곡되는" 문제를
 * 막기 위해 "동기간(같은 개월수) 대비"를 계산할 때 이 값을 기준으로 삼는다.
 * 매출액 데이터가 전혀 없으면 12(전체 기간)를 반환한다.
 */
export function lastMonthWithAnyData(items: IncomeStatementRow[], year: number): number {
  let last = 0;
  for (const item of items) {
    if (item.year !== year) continue;
    if (!item.account_name.includes("매출액")) continue;
    if (item.amount !== 0 && item.month > last) {
      last = item.month;
    }
  }
  return last || 12;
}

export function sumThroughMonth(monthly: number[], throughMonth: number): number {
  return monthly.slice(0, throughMonth).reduce((s, v) => s + v, 0);
}

/**
 * income_statement_items는 (연도, 과목명, 월, 금액)만 저장하고 대분류/세부 구분이나
 * 원본 행 순서는 저장하지 않는다. 표시 시점에 로마숫자 접두어로 대분류 여부를
 * 다시 판별하고, 대분류는 로마숫자 순서로, 세부 계정은 "[코드]" 순서로 정렬한다.
 */
function emptyCell(): IncomeStatementCell {
  return { id: null, amount: 0, isEdited: false, editedBy: null, editedAt: null };
}

export function buildIncomeStatementGrid(
  items: IncomeStatementRow[],
  year: number
): { major: IncomeStatementAccountRow[]; detail: IncomeStatementAccountRow[] } {
  const byAccount = new Map<string, IncomeStatementCell[]>();
  for (const item of items) {
    if (item.year !== year) continue;
    if (!byAccount.has(item.account_name)) {
      byAccount.set(item.account_name, Array.from({ length: 12 }, emptyCell));
    }
    const cells = byAccount.get(item.account_name)!;
    if (item.month >= 1 && item.month <= 12) {
      // 정상적으로 업로드된 데이터는 (연도, 과목, 월)당 행이 하나뿐이므로 덮어쓴다.
      cells[item.month - 1] = {
        id: item.id,
        amount: item.amount,
        isEdited: item.is_edited,
        editedBy: item.edited_by,
        editedAt: item.edited_at,
      };
    }
  }

  const rows: IncomeStatementAccountRow[] = Array.from(byAccount.entries()).map(
    ([accountName, cells]) => {
      const monthly = cells.map((c) => c.amount);
      return {
        accountName,
        isMajor: MAJOR_CATEGORY_PATTERN.test(accountName),
        cells,
        monthly,
        total: monthly.reduce((s, v) => s + v, 0),
      };
    }
  );

  const major = rows
    .filter((r) => r.isMajor)
    .sort((a, b) => majorCategorySortKey(a.accountName) - majorCategorySortKey(b.accountName));
  const detail = rows
    .filter((r) => !r.isMajor)
    .sort((a, b) => detailAccountSortKey(a.accountName) - detailAccountSortKey(b.accountName));

  return { major, detail };
}

export function findMajorCategoryTotal(
  major: IncomeStatementAccountRow[],
  keyword: string
): IncomeStatementAccountRow | null {
  return major.find((r) => r.accountName.includes(keyword)) ?? null;
}

export function monthlyLedgerTotals(
  entries: LedgerEntryRow[],
  entryType: LedgerEntryType,
  year: number,
  field: "supply_amount" | "total_amount" | "vat_amount" = "supply_amount"
): number[] {
  const monthly = new Array(12).fill(0);
  for (const entry of entries) {
    if (entry.entry_type !== entryType || entry.year !== year) continue;
    const month = Number(entry.entry_date.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthly[month - 1] += entry[field] ?? 0;
    }
  }
  return monthly;
}

export function cumulativeSeries(monthly: number[]): number[] {
  let running = 0;
  return monthly.map((v) => {
    running += v;
    return running;
  });
}

export interface CompositionSlice {
  name: string;
  value: number;
  ratio: number;
}

export function aggregateByAccount(
  entries: LedgerEntryRow[],
  entryType: LedgerEntryType,
  year: number,
  limit = 8
): CompositionSlice[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.entry_type !== entryType || entry.year !== year) continue;
    const key = entry.account_name?.trim() || "기타";
    totals.set(key, (totals.get(key) ?? 0) + (entry.supply_amount ?? 0));
  }
  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);

  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, [, v]) => s + v, 0);
  const slices: CompositionSlice[] = top.map(([name, value]) => ({
    name,
    value,
    ratio: grandTotal > 0 ? value / grandTotal : 0,
  }));
  if (rest > 0) {
    slices.push({ name: "기타", value: rest, ratio: grandTotal > 0 ? rest / grandTotal : 0 });
  }
  return slices;
}

export interface VendorTotal {
  vendor: string;
  count: number;
  totalAmount: number;
}

export function topVendors(
  entries: LedgerEntryRow[],
  entryType: LedgerEntryType,
  year: number,
  limit = 5
): VendorTotal[] {
  const totals = new Map<string, VendorTotal>();
  for (const entry of entries) {
    if (entry.entry_type !== entryType || entry.year !== year) continue;
    const key = entry.vendor?.trim() || "미상";
    const existing = totals.get(key) ?? { vendor: key, count: 0, totalAmount: 0 };
    existing.count += 1;
    existing.totalAmount += entry.total_amount ?? 0;
    totals.set(key, existing);
  }
  return Array.from(totals.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}
