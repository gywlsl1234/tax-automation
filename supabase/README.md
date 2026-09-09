# Supabase 마이그레이션 적용 방법

`migrations/` 아래 파일을 **번호 순서대로** Supabase 프로젝트에 적용하세요.

- `0001_init.sql` — 6개 테이블 생성
- `0002_rls.sql` — RLS 활성화 및 최소권한 설정 (보안상 반드시 적용, SECURITY.md 참고)
- `0003_report_links.sql` — 고객 공유 링크(비밀번호 인증 + 5회 실패시 자동 폐기) 테이블/함수
- `0004_client_periods.sql` — 거래처 사업자구분/담당자, 리포트 월별 스냅샷화, 종합소득세 수동입력, 공유 링크 60일 만료
- `0005_vat_settings.sql` — 거래처별 부가세 신고주기(반기/분기) 설정, 예상 부가세 수동입력
- `0006_taxpayer_type.sql` — 거래처 과세유형(일반/간이/간이-세금계산서발급/면세), 부가가치율, 예상 법인세 수동입력

## 방법 1: Supabase 대시보드 SQL Editor (권장, 별도 설치 불필요)

1. https://supabase.com/dashboard 에서 프로젝트 접속
2. 왼쪽 메뉴 `SQL Editor` 클릭
3. `migrations/0001_init.sql` 내용을 복사해 붙여넣고 `Run` 실행
4. 이어서 `migrations/0002_rls.sql`, `migrations/0003_report_links.sql`,
   `migrations/0004_client_periods.sql`, `migrations/0005_vat_settings.sql`,
   `migrations/0006_taxpayer_type.sql` 내용도 각각 새 쿼리로 붙여넣고
   순서대로 `Run` 실행

## 방법 2: Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## 확인

- `Table Editor`에서 `clients`, `reports`, `income_statement_items`,
  `ledger_entries`, `report_notes`, `edit_logs` 6개 테이블이 보이면 1단계 완료.
- 각 테이블 상세 화면에서 "RLS enabled" 표시가 되어 있고 정책이 0개(deny-all)인지
  확인하면 2단계(보안 하드닝) 완료.
