export interface IncomeStatementRow {
  id: string;
  account_name: string;
  year: number;
  month: number;
  amount: number;
  is_edited: boolean;
  edited_by: string | null;
  edited_at: string | null;
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
  id: string;
  section: string;
  content: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface IncomeStatementCell {
  id: string | null;
  amount: number;
  isEdited: boolean;
  editedBy: string | null;
  editedAt: string | null;
}

export interface IncomeStatementAccountRow {
  accountName: string;
  isMajor: boolean;
  cells: IncomeStatementCell[]; // index 0 = 1월 ... index 11 = 12월
  monthly: number[]; // cells의 amount만 뽑은 배열 (차트/합계 계산용)
  total: number;
}
