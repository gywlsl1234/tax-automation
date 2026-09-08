import type {
  IncomeStatementAccountRow,
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
 * income_statement_items는 (연도, 과목명, 월, 금액)만 저장하고 대분류/세부 구분이나
 * 원본 행 순서는 저장하지 않는다. 표시 시점에 로마숫자 접두어로 대분류 여부를
 * 다시 판별하고, 대분류는 로마숫자 순서로, 세부 계정은 "[코드]" 순서로 정렬한다.
 */
export function buildIncomeStatementGrid(
  items: IncomeStatementRow[],
  year: number
): { major: IncomeStatementAccountRow[]; detail: IncomeStatementAccountRow[] } {
  const byAccount = new Map<string, number[]>();
  for (const item of items) {
    if (item.year !== year) continue;
    if (!byAccount.has(item.account_name)) {
      byAccount.set(item.account_name, new Array(12).fill(0));
    }
    const monthly = byAccount.get(item.account_name)!;
    if (item.month >= 1 && item.month <= 12) {
      monthly[item.month - 1] += item.amount;
    }
  }

  const rows: IncomeStatementAccountRow[] = Array.from(byAccount.entries()).map(
    ([accountName, monthly]) => ({
      accountName,
      isMajor: MAJOR_CATEGORY_PATTERN.test(accountName),
      monthly,
      total: monthly.reduce((s, v) => s + v, 0),
    })
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
  field: "supply_amount" | "total_amount" = "supply_amount"
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
