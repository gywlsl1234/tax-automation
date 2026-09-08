-- 기능개선: 거래처 마스터/월별 데이터 분리, 종합소득세 안내, 공유 링크 60일 만료
--
-- 기존 테이블 구조와 데이터는 그대로 유지하고 컬럼만 추가한다. 새 테이블은
-- 만들지 않으므로 RLS(전 테이블 deny-all)는 이미 적용된 정책이 그대로 유효하다.

-- 1) clients: 사업자 구분(개인/법인) + 거래처측 담당자명
--    기존 거래처는 전부 individual로 채워진다. 실제로 법인인 거래처는 관리자가
--    엑셀 일괄 업로드(사업자구분 컬럼) 또는 추후 수정 기능으로 바로잡아야 한다.
alter table clients add column if not exists entity_type text not null default 'individual'
  check (entity_type in ('individual', 'corporate'));
alter table clients add column if not exists contact_name text; -- 거래처측 담당자명 (세무사무실 담당자인 accountant_name과 다름)

-- 2) reports: "연도 단위 1건"에서 "거래처+연도+월 단위 스냅샷"으로 재정의.
--    기존 report는 report_month가 null로 남아 예전처럼 동작한다(화면에도 월 없이 표시).
--    새로 업로드되는 report는 반드시 report_month를 채우고, 같은 (거래처, 연도, 월)
--    조합은 유니크 인덱스로 강제해 애플리케이션 코드가 "있으면 갱신, 없으면 생성"
--    방식으로 중복 없이 관리할 수 있게 한다.
alter table reports add column if not exists report_month int check (report_month between 1 and 12);
create unique index if not exists idx_reports_client_year_month
  on reports(client_id, base_year, report_month)
  where report_month is not null;

-- 3) reports: 예상 종합소득세 수동 입력(선택). 비워두면 애플리케이션이 손익계산서
--    누적 데이터로 자동 계산한다.
alter table reports add column if not exists manual_tax_override boolean not null default false;
alter table reports add column if not exists manual_annual_income numeric;
alter table reports add column if not exists manual_income_tax numeric;
alter table reports add column if not exists manual_local_tax numeric;

-- 4) report_links: 공유 링크 60일 만료.
--    이미 존재하는 링크는 "생성일 + 60일"로 개별 백필하고(모두 같은 시각으로 뭉치지
--    않도록 update 문에서 각 행의 created_at을 그대로 사용), 그 다음에 새 행에 대한
--    기본값(발급 시각 + 60일)을 설정한다.
alter table report_links add column if not exists expires_at timestamptz;
update report_links set expires_at = created_at + interval '60 days' where expires_at is null;
alter table report_links alter column expires_at set default (now() + interval '60 days');
alter table report_links alter column expires_at set not null;
