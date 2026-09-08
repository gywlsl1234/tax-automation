import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { NewReportUploadForm } from "@/components/admin/NewReportUploadForm";

export const dynamic = "force-dynamic";

export default async function NewReportUploadPage() {
  const supabase = getSupabaseAdminClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, biz_reg_no")
    .order("company_name", { ascending: true });

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>보고서 생성 — 엑셀 업로드</h1>
      <NewReportUploadForm
        clients={(clients ?? []).map((c) => ({
          id: c.id,
          companyName: c.company_name,
          bizRegNo: c.biz_reg_no,
        }))}
      />
    </main>
  );
}
