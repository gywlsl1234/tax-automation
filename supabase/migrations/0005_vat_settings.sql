-- UI/UX 고도화: 거래처별 부가세 신고주기 설정 + 예상 부가세 수동 입력
--
-- 기존 컬럼/테이블은 전혀 건드리지 않고 추가만 한다.

-- 거래처별로 부가세를 반기(1기/2기, 2회) 기준으로 볼지 분기(1~4분기, 4회)
-- 기준으로 볼지 관리자가 설정할 수 있게 한다. 기본값은 지금까지 안내해온
-- 반기(semiannual) 방식.
alter table clients add column if not exists vat_period_type text not null default 'semiannual'
  check (vat_period_type in ('semiannual', 'quarterly'));

-- 예상 종합소득세(manual_tax_*, 0004에서 추가)와 같은 취지의 수동 입력
-- 오버라이드이지만, 부가세는 반기(2개)/분기(4개)로 기간이 여러 개라 고정
-- 컬럼 대신 jsonb 배열로 저장한다. 비워두면 애플리케이션이 매입/매출장의
-- vat_amount를 집계해 자동 계산한다.
-- 형식: [{ "label": "1기(1~6월)", "salesVat": 1000, "purchaseVat": 500, "payableVat": 500 }, ...]
alter table reports add column if not exists manual_vat_override boolean not null default false;
alter table reports add column if not exists manual_vat_periods jsonb;
