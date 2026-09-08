export interface ParsedClientInfo {
  companyName: string;
  ceoName: string;
  bizRegNo: string;
  bizType: string | null;
  bizItem: string | null;
  openDate: string | null; // YYYY-MM-DD
  address: string | null;
  phone: string | null;
  email: string | null;
  fiscalMonth: number | null;
  accountingFirm: string | null;
  accountantName: string | null;
}

export interface ParsedReportSettings {
  baseYear: number;
  compareYear: number | null;
  currencyUnit: string;
  publicDays: number | null;
  usePassword: boolean;
  password: string | null;
  logoFileName: string | null;
  publisherName: string | null;
  customerNotice: string | null;
}

export interface ParsedIncomeStatementItem {
  year: number;
  accountName: string;
  month: number;
  amount: number;
  isMajorCategory: boolean;
}

export type LedgerEntryType = "매출" | "매입";

export interface ParsedLedgerEntry {
  year: number;
  entryType: LedgerEntryType;
  entryDate: string; // YYYY-MM-DD
  entryNo: string | null;
  vendor: string | null;
  vendorRegNo: string | null;
  itemName: string | null;
  supplyAmount: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  accountName: string | null;
  cardCompany: string | null;
  cardNumber: string | null;
}

export interface ParseIssue {
  row: number;
  message: string;
}
