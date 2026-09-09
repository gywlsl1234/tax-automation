-- 거래처 과세유형(일반/간이/간이-세금계산서발급/면세) 및 법인세 지원
--
-- 기존 컬럼은 그대로 두고 추가만 한다.

-- 부가세 신고 유형. 계산 방식이 완전히 달라서 entity_type(개인/법인)과는
-- 별개 축으로 관리한다.
-- - general: 일반과세자 → 매출세액-매입세액 (기존 vat.ts 로직)
-- - simplified: 간이과세자 → 부가세 계산 비활성화(업종 구조가 달라 이 앱에서 다루지 않음)
-- - simplified_invoice: 간이과세자(세금계산서발급) → 매출액×부가가치율×10%-매입액×0.5% (간이과세자 계산구조)
-- - exempt: 면세사업자 → 부가세 계산 비활성화
alter table clients add column if not exists vat_taxpayer_type text not null default 'general'
  check (vat_taxpayer_type in ('general', 'simplified', 'simplified_invoice', 'exempt'));

-- 간이과세자/간이(세금계산서발급)에서만 쓰는 업종별 부가가치율(%). 거래처마다
-- 업종이 달라 관리자가 직접 입력한다(예: 소매업 15, 서비스업 30).
alter table clients add column if not exists simplified_vat_rate numeric;

-- 예상 법인세 수동 입력 오버라이드. 예상 종합소득세(manual_tax_*, 0004)와
-- 동일한 패턴이지만 법인 전용 컬럼으로 분리한다.
alter table reports add column if not exists manual_corp_tax_override boolean not null default false;
alter table reports add column if not exists manual_corp_annual_income numeric;
alter table reports add column if not exists manual_corp_tax numeric;
alter table reports add column if not exists manual_corp_local_tax numeric;
