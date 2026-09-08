-- Phase 1 보안 하드닝: RLS(Row Level Security) 활성화 + 최소권한 원칙
--
-- 설계 원칙:
--   1) 이 서비스는 브라우저가 Supabase에 직접 쿼리하지 않는다.
--      관리자 화면과 고객 열람 화면 모두 Next.js 서버(Route Handler/Server
--      Component)를 통해서만 데이터에 접근하고, 서버는 service_role 키를 사용한다.
--      service_role 키는 RLS를 완전히 우회하므로 정상 동작에는 아래 정책이
--      필요하지 않지만, "키가 실수로 유출되거나 잘못된 클라이언트 키가 쓰이는
--      경우"에 대비한 심층 방어(defense-in-depth) 차원에서 anon/authenticated
--      역할에는 명시적으로 아무 권한도 주지 않는다.
--   2) 고객은 Supabase Auth 계정이 없고(로그인 없는 링크 토큰 방식), 관리자만
--      NextAuth로 별도 인증한다. 따라서 Supabase 레벨의 auth.uid() 기반 정책은
--      사용하지 않고, "anon/authenticated에는 전면 차단, service_role만 허용"
--      구조로 최소권한을 구현한다.
--   3) 추후 고객사별 접근 정책이 Supabase Auth 기반으로 바뀌는 경우, 이 파일의
--      deny-all 정책을 client_id/report_id 소유권 검증 정책으로 교체한다.

alter table clients enable row level security;
alter table reports enable row level security;
alter table income_statement_items enable row level security;
alter table ledger_entries enable row level security;
alter table report_notes enable row level security;
alter table edit_logs enable row level security;

-- 강제(force) 옵션으로, 테이블 소유자(예: 마이그레이션 실행 계정)로 접속하더라도
-- RLS를 우회하지 못하게 한다. service_role은 Supabase 내부적으로 RLS 자체를
-- 우회하는 별도 경로를 쓰므로 영향받지 않는다.
alter table clients force row level security;
alter table reports force row level security;
alter table income_statement_items force row level security;
alter table ledger_entries force row level security;
alter table report_notes force row level security;
alter table edit_logs force row level security;

-- anon / authenticated 역할에 대해 테이블 권한 자체를 회수한다.
-- (RLS 정책을 만들지 않아도 REVOKE만으로 이미 접근이 차단되지만,
--  실수로 향후 permissive 정책이 추가되는 사고를 막기 위한 이중 방어.)
revoke all on clients, reports, income_statement_items, ledger_entries, report_notes, edit_logs
  from anon, authenticated;

-- 의도적으로 SELECT/INSERT/UPDATE/DELETE 정책을 하나도 만들지 않는다.
-- => anon/authenticated 역할은 RLS에 의해 모든 행에 대해 기본 거부(deny-all)된다.
-- => service_role은 RLS 및 위 REVOKE와 무관하게 항상 전체 접근 가능(Supabase 기본 동작).
