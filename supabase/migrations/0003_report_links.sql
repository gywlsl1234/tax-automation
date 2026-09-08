-- Phase 5: 고객 공유 링크(비밀번호 인증 + 자동 폐기) 지원
--
-- 기존 reports.link_token / reports.password_hash 컬럼은 링크 1개만 표현할 수 있어
-- "재발급 시 기존 링크는 폐기하되 이력은 남긴다"는 요구를 담을 수 없다. 그래서
-- 링크 발급 이력을 별도 테이블(report_links)로 분리한다. 재발급마다 새 행이
-- 생기고, 옛 행은 status='revoked'로 남아 있어 "폐기된 링크로 접속 시 안내 문구"
-- 요구사항을 그대로 구현할 수 있다.

alter table reports alter column link_token drop not null;
alter table reports drop constraint if exists reports_link_token_key;

create table report_links (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  link_token text not null unique,       -- crypto.randomBytes 기반, 추측 불가능한 길이
  password_hash text not null,           -- bcrypt 해시. 평문 비밀번호는 저장하지 않는다.
  status text not null default 'active', -- active | revoked
  fail_count int not null default 0,     -- 비밀번호 연속 실패 횟수 (서버/DB 기준, 브라우저 상태 아님)
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint report_links_status_check check (status in ('active', 'revoked'))
);

create index idx_report_links_report_id on report_links(report_id);

-- 한 보고서에 "활성" 링크는 최대 1개만 존재하도록 강제한다.
-- (재발급 시 애플리케이션 코드가 기존 활성 링크를 먼저 revoked로 바꾼 뒤 새로 만든다.)
create unique index idx_report_links_one_active_per_report
  on report_links(report_id)
  where status = 'active';

alter table report_links enable row level security;
alter table report_links force row level security;
revoke all on report_links from anon, authenticated;

-- 비밀번호 실패 횟수를 원자적으로 1 증가시키고, 임계값(max_fail) 이상이면
-- 같은 트랜잭션 안에서 즉시 status를 revoked로 바꾼다. 단일 UPDATE 문이라
-- 동시 요청이 와도 경쟁 상태(race condition) 없이 정확히 계산된다.
-- (이미 revoked인 링크는 where 절에 안 걸려 아무 것도 갱신되지 않는다 —
--  "폐기된 링크는 비밀번호를 맞혀도 다시 살아나지 않는다"는 요구를 만족한다.)
create or replace function increment_report_link_fail_count(p_link_id uuid, p_max_fail int)
returns table (new_fail_count int, new_status text)
language sql
as $$
  update report_links
  set fail_count = fail_count + 1,
      status = case when fail_count + 1 >= p_max_fail then 'revoked' else status end,
      revoked_at = case when fail_count + 1 >= p_max_fail then now() else revoked_at end
  where id = p_link_id and status = 'active'
  returning fail_count, status;
$$;

-- 테이블 REVOKE와 동일한 이유로 역할명을 직접 지정한다: Supabase가 새 객체에
-- anon/authenticated/service_role 앞으로 각각 별도 기본 권한을 부여하기 때문에
-- "from public"만으로는 anon/authenticated의 실행 권한이 제거되지 않는다.
-- service_role은 이름을 넣지 않으므로 서버 라우트의 RPC 호출은 영향받지 않는다.
revoke all on function increment_report_link_fail_count(uuid, int) from anon, authenticated;
