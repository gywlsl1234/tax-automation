import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 예상 법인세 수동 입력(override) 저장. tax-override(종합소득세)와 동일한 패턴.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reportId } = await params;
  const body = await request.json();
  const enabled = Boolean(body.enabled);
  const annualIncome = body.annualIncome === null || body.annualIncome === undefined ? null : Number(body.annualIncome);
  const corpTax = body.corpTax === null || body.corpTax === undefined ? null : Number(body.corpTax);
  const localTax = body.localTax === null || body.localTax === undefined ? null : Number(body.localTax);

  for (const [label, value] of [
    ["annualIncome", annualIncome],
    ["corpTax", corpTax],
    ["localTax", localTax],
  ] as const) {
    if (value !== null && Number.isNaN(value)) {
      return NextResponse.json({ error: `${label}은 숫자여야 합니다.` }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdminClient();

  const { data: existing, error: findError } = await supabase
    .from("reports")
    .select("id, manual_corp_tax_override, manual_corp_annual_income, manual_corp_tax, manual_corp_local_tax")
    .eq("id", reportId)
    .single();
  if (findError || !existing) {
    return NextResponse.json({ error: "보고서를 찾을 수 없습니다." }, { status: 404 });
  }

  const editedBy = session.user.email ?? "admin";
  const editedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      manual_corp_tax_override: enabled,
      manual_corp_annual_income: annualIncome,
      manual_corp_tax: corpTax,
      manual_corp_local_tax: localTax,
    })
    .eq("id", reportId);
  if (updateError) {
    return NextResponse.json({ error: `수정 실패: ${updateError.message}` }, { status: 500 });
  }

  const { error: logError } = await supabase.from("edit_logs").insert({
    report_id: reportId,
    target_table: "reports",
    target_id: reportId,
    field_name: "manual_corp_tax_override",
    old_value: JSON.stringify({
      enabled: existing.manual_corp_tax_override,
      annualIncome: existing.manual_corp_annual_income,
      corpTax: existing.manual_corp_tax,
      localTax: existing.manual_corp_local_tax,
    }),
    new_value: JSON.stringify({ enabled, annualIncome, corpTax, localTax }),
    edited_by: editedBy,
    edited_at: editedAt,
  });

  return NextResponse.json({ ok: true, logWarning: logError?.message });
}
