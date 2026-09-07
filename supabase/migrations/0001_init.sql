-- Phase 1: initial schema for 고객 재무보고서 공유 포털
-- Source: 작업지시서 3장 데이터 모델

create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,        -- 상호(법인명)
  ceo_name text not null,            -- 대표자명
  biz_reg_no text not null,          -- 사업자등록번호
  biz_type text,                     -- 업태
  biz_item text,                     -- 종목
  open_date date,
  address text,
  phone text,
  email text,
  fiscal_month int,                  -- 결산월
  accounting_firm text,
  accountant_name text,
  created_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  base_year int not null,            -- 기준연도
  compare_year int,                  -- 비교연도
  currency_unit text default '원',
  link_token text unique not null,   -- 고유 링크에 쓰이는 랜덤 토큰
  password_hash text,                -- 열람 비밀번호 사용 시
  expires_at timestamptz,            -- 공개기간 만료 시각
  published_at timestamptz,
  status text default 'draft',       -- draft | published | expired
  created_at timestamptz default now()
);

create table if not exists income_statement_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  year int not null,
  account_name text not null,        -- 과목 (예: Ⅰ. 매출액)
  month int not null,                -- 1~12
  amount numeric not null,
  is_edited boolean default false,   -- 관리자가 직접 수정했는지 여부
  edited_by text,
  edited_at timestamptz
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  year int not null,
  entry_type text not null,          -- 매출 | 매입
  entry_date date,
  entry_no text,
  vendor text,
  vendor_reg_no text,
  item_name text,
  supply_amount numeric,
  vat_amount numeric,
  total_amount numeric,
  account_name text,                 -- 계정과목
  card_company text,
  card_number text
);

create table if not exists report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  section text not null,             -- summary | pl | sales | purchase | memo
  content text,
  updated_by text,
  updated_at timestamptz default now()
);

create table if not exists edit_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  target_table text,
  target_id uuid,
  field_name text,
  old_value text,
  new_value text,
  edited_by text,
  edited_at timestamptz default now()
);

create index if not exists idx_reports_client_id on reports(client_id);
create index if not exists idx_reports_link_token on reports(link_token);
create index if not exists idx_income_statement_items_report_id on income_statement_items(report_id);
create index if not exists idx_ledger_entries_report_id on ledger_entries(report_id);
create index if not exists idx_report_notes_report_id on report_notes(report_id);
create index if not exists idx_edit_logs_report_id on edit_logs(report_id);
