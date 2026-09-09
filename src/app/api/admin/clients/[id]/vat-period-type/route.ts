import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const VALID_TYPES = ["semiannual", "quarterly"];

/** 거래처별 부가세 신고주기(반기/분기) 설정을 저장한다. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;
  const body = await request.json();
  const vatPeriodType = body.vatPeriodType;
  if (!VALID_TYPES.includes(vatPeriodType)) {
    return NextResponse.json({ error: "vatPeriodType은 semiannual 또는 quarterly여야 합니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("clients").update({ vat_period_type: vatPeriodType }).eq("id", clientId);
  if (error) {
    return NextResponse.json({ error: `수정 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, vatPeriodType });
}
