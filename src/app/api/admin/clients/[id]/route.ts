import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 거래처 삭제. reports.client_id가 on delete cascade로 걸려 있어 이 거래처의
 * 모든 리포트(손익계산서/매입매출장/메모/공유링크 포함)가 함께 삭제된다 —
 * 되돌릴 수 없으므로 화면에서 반드시 강한 확인을 거치게 한다.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) {
    return NextResponse.json({ error: `삭제 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
