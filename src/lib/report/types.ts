export interface IncomeStatementRow {
  account_name: string;
  year: number;
  month: number;
  amount: number;
  is_edited?: boolean;
}

export type LedgerEntryType = "매출" | "매입";

export interface LedgerEntryRow {
  year: number;
  entry_type: LedgerEntryType;
  entry_date: string;
  entry_no: string | null;
  vendor: string | null;
  vendor_reg_no: string | null;
  item_name: string | null;
  supply_amount: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  account_name: string | null;
  card_company: string | null;
  card_number: string | null;
}

export interface ReportNoteRow {
  section: string;
  content: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface IncomeStatementAccountRow {
  accountName: string;
  isMajor: boolean;
  monthly: number[]; // index 0 = 1월 ... index 11 = 12월
  total: number;
}
