import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 예상 부가세 수동 입력(override) 저장. tax-override와 동일한 패턴이지만,
 * 부가세는 반기(2개)/분기(4개)로 기간이 여러 개라 배열(jsonb)로 저장한다.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reportId } = await params;
  const body = await request.json();
  const enabled = Boolean(body.enabled);
  const periodsRaw = Array.isArray(body.periods) ? body.periods : [];

  const validatedPeriods: { label: string; salesVat: number; purchaseVat: number; payableVat: number }[] = [];
  for (const p of periodsRaw) {
    const period = p as { label?: unknown; salesVat?: unknown; purchaseVat?: unknown };
    const salesVat = Number(period.salesVat);
    const purchaseVat = Number(period.purchaseVat);
    if (typeof period.label !== "string" || Number.isNaN(salesVat) || Number.isNaN(purchaseVat)) {
      return NextResponse.json({ error: "부가세 기간별 입력값이 올바르지 않습니다." }, { status: 400 });
    }
    validatedPeriods.push({ label: period.label, salesVat, purchaseVat, payableVat: salesVat - purchaseVat });
  }

  const supabase = getSupabaseAdminClient();

  const { data: existing, error: findError } = await supabase
    .from("reports")
    .select("id, manual_vat_override, manual_vat_periods")
    .eq("id", reportId)
    .single();
  if (findError || !existing) {
    return NextResponse.json({ error: "보고서를 찾을 수 없습니다." }, { status: 404 });
  }

  const editedBy = session.user.email ?? "admin";
  const editedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("reports")
    .update({ manual_vat_override: enabled, manual_vat_periods: validatedPeriods })
    .eq("id", reportId);
  if (updateError) {
    return NextResponse.json({ error: `수정 실패: ${updateError.message}` }, { status: 500 });
  }

  const { error: logError } = await supabase.from("edit_logs").insert({
    report_id: reportId,
    target_table: "reports",
    target_id: reportId,
    field_name: "manual_vat_override",
    old_value: JSON.stringify({ enabled: existing.manual_vat_override, periods: existing.manual_vat_periods }),
    new_value: JSON.stringify({ enabled, periods: validatedPeriods }),
    edited_by: editedBy,
    edited_at: editedAt,
  });

  return NextResponse.json({ ok: true, logWarning: logError?.message });
}
