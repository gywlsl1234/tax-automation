import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 과거 리포트 선택 삭제. FK가 전부 `on delete cascade`로 걸려 있어
 * income_statement_items/ledger_entries/report_notes/edit_logs/report_links가
 * 함께 삭제된다 — 삭제된 리포트의 공유 링크가 즉시 접근 불가능해지는 요구사항이
 * 별도 코드 없이 스키마 레벨에서 충족된다. 거래처(clients)나 다른 월의 리포트는
 * 영향받지 않는다(row 단위 삭제이므로).
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "삭제할 리포트를 선택해주세요." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("reports").delete().in("id", ids);
  if (error) {
    return NextResponse.json({ error: `삭제 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedCount: ids.length });
}
