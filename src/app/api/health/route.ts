import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { count, error } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, stage: "query", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      db: "connected",
      clients_count: count ?? 0,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "config",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
