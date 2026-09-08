import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 예상 종합소득세 수동 입력(override) 저장. 기존 손익계산서 셀 수정과 동일하게
 * edit_logs에 이전/이후 값을 남긴다 (작업지시서 4번, 기존 감사로그 패턴 재사용).
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
  const incomeTax = body.incomeTax === null || body.incomeTax === undefined ? null : Number(body.incomeTax);
  const localTax = body.localTax === null || body.localTax === undefined ? null : Number(body.localTax);

  for (const [label, value] of [
    ["annualIncome", annualIncome],
    ["incomeTax", incomeTax],
    ["localTax", localTax],
  ] as const) {
    if (value !== null && Number.isNaN(value)) {
      return NextResponse.json({ error: `${label}은 숫자여야 합니다.` }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdminClient();

  const { data: existing, error: findError } = await supabase
    .from("reports")
    .select("id, manual_tax_override, manual_annual_income, manual_income_tax, manual_local_tax")
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
      manual_tax_override: enabled,
      manual_annual_income: annualIncome,
      manual_income_tax: incomeTax,
      manual_local_tax: localTax,
    })
    .eq("id", reportId);
  if (updateError) {
    return NextResponse.json({ error: `수정 실패: ${updateError.message}` }, { status: 500 });
  }

  const { error: logError } = await supabase.from("edit_logs").insert({
    report_id: reportId,
    target_table: "reports",
    target_id: reportId,
    field_name: "manual_tax_override",
    old_value: JSON.stringify({
      enabled: existing.manual_tax_override,
      annualIncome: existing.manual_annual_income,
      incomeTax: existing.manual_income_tax,
      localTax: existing.manual_local_tax,
    }),
    new_value: JSON.stringify({ enabled, annualIncome, incomeTax, localTax }),
    edited_by: editedBy,
    edited_at: editedAt,
  });

  return NextResponse.json({ ok: true, logWarning: logError?.message });
}
