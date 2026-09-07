# Supabase 마이그레이션 적용 방법

`migrations/0001_init.sql` 파일을 Supabase 프로젝트에 적용하려면 아래 중 한 가지 방법을 사용하세요.

## 방법 1: Supabase 대시보드 SQL Editor (권장, 별도 설치 불필요)

1. https://supabase.com/dashboard 에서 프로젝트 접속
2. 왼쪽 메뉴 `SQL Editor` 클릭
3. `migrations/0001_init.sql` 파일 내용을 복사해 붙여넣고 `Run` 실행

## 방법 2: Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## 확인

적용 후 대시보드 `Table Editor`에서 `clients`, `reports`, `income_statement_items`,
`ledger_entries`, `report_notes`, `edit_logs` 6개 테이블이 보이면 완료입니다.
