import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 손익계산서 특정 셀(금액) 수정. is_edited=true로 표시하고 edit_logs에
 * 이전 값/이후 값을 남긴다 (작업지시서 5-1, Phase 4 완료 기준).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const body = await request.json();
  const newAmount = Number(body.amount);
  if (Number.isNaN(newAmount)) {
    return NextResponse.json({ error: "amount는 숫자여야 합니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: existing, error: findError } = await supabase
    .from("income_statement_items")
    .select("id, report_id, amount")
    .eq("id", itemId)
    .single();

  if (findError || !existing) {
    return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
  }

  const editedBy = session.user.email ?? "admin";
  const editedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("income_statement_items")
    .update({ amount: newAmount, is_edited: true, edited_by: editedBy, edited_at: editedAt })
    .eq("id", itemId)
    .select("id, amount, is_edited, edited_by, edited_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: `수정 실패: ${updateError?.message}` }, { status: 500 });
  }

  const { error: logError } = await supabase.from("edit_logs").insert({
    report_id: existing.report_id,
    target_table: "income_statement_items",
    target_id: itemId,
    field_name: "amount",
    old_value: String(existing.amount),
    new_value: String(newAmount),
    edited_by: editedBy,
    edited_at: editedAt,
  });
  if (logError) {
    // 로그 실패는 값 수정 자체를 막지 않되, 사실을 알린다.
    return NextResponse.json({ ...updated, logWarning: logError.message });
  }

  return NextResponse.json(updated);
}
