import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const VALID_TYPES = ["general", "simplified", "simplified_invoice", "exempt"];

/** 거래처별 부가세 과세유형(+간이과세자 업종별 부가가치율) 설정을 저장한다. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;
  const body = await request.json();
  const vatTaxpayerType = body.vatTaxpayerType;
  if (!VALID_TYPES.includes(vatTaxpayerType)) {
    return NextResponse.json({ error: "vatTaxpayerType 값이 올바르지 않습니다." }, { status: 400 });
  }
  const simplifiedVatRate =
    body.simplifiedVatRate === null || body.simplifiedVatRate === undefined || body.simplifiedVatRate === ""
      ? null
      : Number(body.simplifiedVatRate);
  if (simplifiedVatRate !== null && Number.isNaN(simplifiedVatRate)) {
    return NextResponse.json({ error: "부가가치율은 숫자여야 합니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("clients")
    .update({ vat_taxpayer_type: vatTaxpayerType, simplified_vat_rate: simplifiedVatRate })
    .eq("id", clientId);
  if (error) {
    return NextResponse.json({ error: `수정 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, vatTaxpayerType, simplifiedVatRate });
}
