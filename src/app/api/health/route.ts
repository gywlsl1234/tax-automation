import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// 최소 정보만 노출하는 인프라 헬스체크. 행 개수 등 비즈니스 데이터는 반환하지 않는다.
// 상세 에러 메시지는 프로덕션에서 숨긴다 (내부 스키마/설정 정보 유출 방지).
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          db: "error",
          detail: process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, db: "connected" });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        db: "misconfigured",
        detail:
          process.env.NODE_ENV === "development"
            ? err instanceof Error
              ? err.message
              : String(err)
            : undefined,
      },
      { status: 500 }
    );
  }
}
