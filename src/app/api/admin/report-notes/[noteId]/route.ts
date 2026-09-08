import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** 담당자 메모 내용 수정. edit_logs에 이전 값/이후 값을 남긴다. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await params;
  const body = await request.json();
  const newContent = typeof body.content === "string" ? body.content : "";

  const supabase = getSupabaseAdminClient();

  const { data: existing, error: findError } = await supabase
    .from("report_notes")
    .select("id, report_id, content")
    .eq("id", noteId)
    .single();

  if (findError || !existing) {
    return NextResponse.json({ error: "메모를 찾을 수 없습니다." }, { status: 404 });
  }

  const editedBy = session.user.email ?? "admin";
  const editedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("report_notes")
    .update({ content: newContent, updated_by: editedBy, updated_at: editedAt })
    .eq("id", noteId)
    .select("id, content, updated_by, updated_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: `수정 실패: ${updateError?.message}` }, { status: 500 });
  }

  await supabase.from("edit_logs").insert({
    report_id: existing.report_id,
    target_table: "report_notes",
    target_id: noteId,
    field_name: "content",
    old_value: existing.content,
    new_value: newContent,
    edited_by: editedBy,
    edited_at: editedAt,
  });

  return NextResponse.json(updated);
}
