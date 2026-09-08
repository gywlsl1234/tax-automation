# 보안 설계 원칙

이 서비스는 향후 회계 프로그램(위하고 등)과 연동하고, 고객사의 세무·회계
자료 및 개인정보(사업자정보, 매입/매출 상세, 담당자 연락처 등)를 다룬다.
따라서 Phase 1부터 아래 원칙을 지키며 개발한다.

## 1. Secret은 서버에서만 사용한다

- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXTAUTH_SECRET`,
  `ADMIN_PASSWORD_HASH` 등은 브라우저에 절대 전달되지 않는다.
  - Next.js에서 `NEXT_PUBLIC_` 접두사가 없는 환경변수는 원래 서버 번들에만
    포함되지만, 이 프로젝트는 한 걸음 더 나아가 `src/lib/supabase/admin.ts`
    최상단에 `import "server-only"`를 두었다. 이 모듈이 실수로 클라이언트
    컴포넌트 트리에서 import되면 **빌드 자체가 실패**한다.
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 브라우저에
    노출 가능한 값이며, 현재 아키텍처에서는 브라우저가 Supabase에 직접
    쿼리하지 않으므로(아래 3번 참조) 사실상 사용되지 않는다.
- 향후 위하고 등 외부 회계 프로그램 연동 시 발급받는 API 키/OAuth 토큰도
  동일하게 서버 전용 모듈(`server-only` 가드)에서만 다룬다.

## 2. GitHub에 credential이 커밋되지 않도록 한다

- `.gitignore`에서 `.env*`를 전부 무시하고, 커밋해도 되는 템플릿인
  `.env.local.example`만 예외로 허용한다.
- `scripts/git-hooks/pre-commit`을 `npm install` 시 자동으로
  `.git/hooks/pre-commit`에 설치한다(`package.json`의 `prepare` 스크립트).
  이 훅은 다음을 커밋 시점에 차단한다.
  - `.env`, `.env.local` 등 환경변수 파일 자체가 스테이징된 경우
  - PEM 개인키, Supabase JWT/서비스 키 패턴, 비밀번호가 포함된 DB 접속
    문자열(`DATABASE_URL` 형태), AWS Access Key 등 흔한 시크릿 패턴이
    diff에 포함된 경우
  - 이 훅은 실수 방지를 위한 1차 방어선이며, GitHub의 push protection이나
    별도 secret scanning(예: gitleaks CI 잡)을 대체하지 않는다. 저장소를
    공개로 전환하거나 외부 협업자가 늘어나면 GitHub Advanced Security /
    gitleaks CI 도입을 권장한다.
- 이미 히스토리에 시크릿이 커밋된 경우, `.gitignore`에 추가하는 것만으로는
  부족하며 반드시 **키를 즉시 로테이션**하고 필요 시 히스토리를 재작성해야
  한다(이 저장소에는 현재까지 실제 시크릿이 커밋된 적 없음).

## 3. Supabase RLS와 최소권한 원칙

- 이 서비스는 브라우저가 Supabase에 직접 쿼리하지 않는 구조로 설계했다.
  관리자 화면과 고객 열람 화면 모두 Next.js 서버(Route Handler / Server
  Component / Server Action)를 거쳐서만 데이터에 접근하고, 서버는
  `service_role` 키로 Supabase에 접근한다.
- `supabase/migrations/0002_rls.sql`에서 6개 테이블 전체에 RLS를 활성화하고
  `anon`/`authenticated` 역할의 테이블 권한을 REVOKE했다. 즉,
  - 관리자/고객을 막론하고 브라우저에서 직접 anon key로 이 테이블에
    접근하면 **아무 것도 조회/변경할 수 없다** (deny-all).
  - `service_role` 키는 Supabase 설계상 RLS를 우회하므로, 실제 데이터
    접근은 전부 Next.js 서버 코드의 권한 검사(관리자 세션 확인, 고객
    링크 토큰 검증)를 통과해야만 이루어진다.
  - 이는 "키가 유출되어도 피해를 최소화한다"는 심층 방어(defense in depth)
    차원이며, 주 방어선은 여전히 서버 라우트의 인가 로직이다.
- 향후 고객사에도 Supabase Auth 계정을 부여하는 방향으로 바뀐다면,
  `0002_rls.sql`의 deny-all 정책을 `client_id`/`report_id` 소유권 기반
  정책으로 교체해야 한다(현재는 고객이 로그인 없이 링크 토큰으로만
  접근하는 구조라 Supabase Auth의 `auth.uid()` 기반 정책이 맞지 않는다).

## 4. 관리자 / 고객 권한 분리

- **관리자**: NextAuth(Credentials Provider) + bcrypt 해시로 인증한다.
  `src/proxy.ts`(Next.js 16의 proxy 파일 규칙, 과거 middleware)가
  `/admin/*`, `/api/admin/*` 전체를 감시하며, 세션이 없으면
  - 페이지 요청은 `/admin/login`으로 리다이렉트
  - API 요청은 401 JSON 응답
  으로 즉시 차단한다.
- **고객**: 별도의 Supabase Auth 계정을 만들지 않고, `report_links` 테이블의
  `link_token` + 비밀번호 기반 접근 방식을 쓴다(`/r/[token]`). 관리자 인증
  경로와 코드 레벨에서 완전히 분리되어 있어, 고객이 관리자 세션/권한을
  획득할 방법이 없다. 자세한 설계는 6번 항목 참고.
- 관리자 비밀번호는 평문으로 저장/전달되지 않는다. `scripts/generate-admin-hash.mjs`
  로 bcrypt 해시를 생성해 `ADMIN_PASSWORD_HASH`에만 저장한다.
  - 주의: Next.js는 `.env` 값 안의 `$VAR`를 변수 참조로 확장하므로, bcrypt
    해시의 `$`는 반드시 `\$`로 이스케이프해서 넣어야 한다(스크립트가 이스케이프된
    값도 함께 출력한다).

## 5. 유지해야 할 것

- 모든 `/api/admin/*` 라우트는 `auth()`로 세션을 확인한 뒤
  `getSupabaseAdminClient()`를 사용한다 (proxy가 1차로 막아주지만, 라우트
  핸들러 내부에서도 이중으로 세션을 검증하는 것을 권장 — Next.js 공식
  문서도 proxy 하나에만 의존하지 말라고 명시하고 있다).
- 키 로테이션: Supabase 프로젝트 설정에서 `service_role`/`anon` 키를
  주기적으로 재발급할 수 있으며, 재발급 시 Vercel 환경변수도 함께 갱신해야
  한다. 담당자 퇴사/외주 종료 시에도 키 로테이션을 진행한다.

## 6. 고객 공유 링크 (`report_links`, `/r/[token]`)

- **비밀번호는 서버에서만 검증한다.** `POST /api/public/report-links/[token]/verify`
  가 bcrypt.compare로 검증하며, 클라이언트는 평문 비밀번호를 전송할 뿐
  일치 여부 판단에는 관여하지 않는다.
- **비밀번호는 절대 평문으로 저장하지 않는다.** `report_links.password_hash`
  에는 bcrypt 해시만 저장한다. 링크 발급 시 계산되는 기본 비밀번호(사업자
  등록번호 뒤 5자리)는 발급 응답에 한 번만 담아 관리자에게 보여주고,
  DB나 로그 어디에도 평문으로 남기지 않는다.
- **링크 토큰은 추측 불가능한 랜덤 값**(`crypto.randomBytes(24)`, 32자
  URL-safe)이다.
- **실패 횟수는 DB 기준으로 서버에서만 관리한다.** 브라우저 상태(로컬
  스토리지, 쿠키 등)에 의존하지 않으므로 새로고침/브라우저 변경/시크릿
  모드로 우회할 수 없다. 5회 실패 시 자동 폐기되는 로직은
  `increment_report_link_fail_count` Postgres 함수 안에서 **단일 UPDATE
  문**으로 원자적으로 처리한다 — 동시에 여러 요청이 들어와도 경쟁 상태
  없이 정확히 계산된다.
- **폐기된 링크는 절대 되살아나지 않는다.** 위 함수는 `where status = 'active'`
  조건이 걸려 있어, 이미 폐기된 링크에 대해 비밀번호를 다시 맞혀도 그
  UPDATE는 아무 행에도 영향을 주지 않는다. `/r/[token]` 페이지 자체도
  링크 상태가 `active`가 아니면 비밀번호 입력창을 아예 보여주지 않는다
  (검증 시도 자체를 차단).
- **재발급 시 기존 링크는 즉시 폐기된다.** `report_links(report_id) where
  status='active'`에 유니크 인덱스를 걸어 DB 레벨에서도 "활성 링크는
  보고서당 최대 1개"를 강제한다. 관리자가 재발급 버튼을 누르면 기존 활성
  링크를 revoked로 바꾼 뒤에만 새 링크를 만들 수 있다.
- **세션 쿠키**: 비밀번호 검증에 성공하면 `src/lib/publicLink/session.ts`가
  HMAC(SHA-256, `NEXTAUTH_SECRET`)으로 서명한 단기(4시간) 쿠키를 발급한다.
  - `HttpOnly`, `SameSite=Lax`, 프로덕션에서 `Secure`, `Path=/r/<token>`로
    스코프를 좁혀서 다른 보고서 링크와 세션이 섞이지 않는다.
  - 매 요청마다 서명과 만료시각을 서버에서 재검증하고, DB의 현재
    `status`도 다시 확인한다 — 세션이 유효해도 그 사이 관리자가 링크를
    재발급/폐기했다면 즉시 차단된다.
- **RLS는 기존 deny-all 구조를 그대로 유지**한다. `report_links` 테이블도
  RLS 활성화 + `anon`/`authenticated` REVOKE, `increment_report_link_fail_count`
  함수도 `anon`/`authenticated`로부터 EXECUTE 권한을 회수했다(테이블과
  동일하게 역할명을 직접 지정 — Supabase가 새 객체 생성 시 `anon` 등에
  기본 권한을 부여하므로 `REVOKE ... FROM PUBLIC`만으로는 충분하지 않다).
  고객 화면도 브라우저가 Supabase에 직접 접근하지 않고 항상
  `getSupabaseAdminClient()`(service_role)를 통해서만 조회한다.
- **관리자 대시보드에서 상태 가시성 확보**: `/admin/reports/[id]/preview`의
  공유 링크 패널에서 각 링크의 정상/폐기 상태, 실패 횟수, 발급/폐기 시각을
  전부 볼 수 있다.
