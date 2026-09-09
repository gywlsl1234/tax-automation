import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type EntityType = "individual" | "corporate";
export type VatTaxpayerType = "general" | "simplified" | "simplified_invoice" | "exempt";

export interface ClientUpsertInput {
  companyName: string;
  ceoName: string;
  bizRegNo: string;
  bizType?: string | null;
  bizItem?: string | null;
  openDate?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  fiscalMonth?: number | null;
  accountingFirm?: string | null;
  accountantName?: string | null;
  /** 지정하지 않으면 기존 값(신규 생성 시 DB 기본값 'individual')을 그대로 둔다. */
  entityType?: EntityType;
  /** 지정하지 않으면 기존 값을 그대로 둔다. */
  contactName?: string | null;
  /** 지정하지 않으면 기존 값(신규 생성 시 DB 기본값 'general')을 그대로 둔다. */
  vatTaxpayerType?: VatTaxpayerType;
  /** 간이과세자/간이(세금계산서발급) 전용 업종별 부가가치율(%). 지정하지 않으면 기존 값을 그대로 둔다. */
  simplifiedVatRate?: number | null;
}

/**
 * 사업자등록번호(biz_reg_no) 기준으로 거래처를 조회해 있으면 갱신, 없으면 생성한다.
 * 단일 보고서 업로드(upload/route.ts)와 거래처 일괄 업로드(clients/bulk-upload)가
 * 공용으로 쓰는 로직 — 두 곳의 upsert 정책이 어긋나지 않도록 여기서만 관리한다.
 *
 * entityType/contactName처럼 호출부가 모를 수 있는 필드는 undefined로 두면 기존
 * 값을 덮어쓰지 않는다(부분 업데이트) — 옛 업로드 경로가 새 컬럼을 null로
 * 되돌려버리는 것을 방지한다.
 */
export async function upsertClientByBizRegNo(
  input: ClientUpsertInput
): Promise<{ id: string; created: boolean }> {
  const supabase = getSupabaseAdminClient();

  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("id")
    .eq("biz_reg_no", input.bizRegNo)
    .maybeSingle();
  if (findError) throw new Error(`고객사 조회 실패: ${findError.message}`);

  const row: Record<string, unknown> = {
    company_name: input.companyName,
    ceo_name: input.ceoName,
    biz_reg_no: input.bizRegNo,
    biz_type: input.bizType ?? null,
    biz_item: input.bizItem ?? null,
    open_date: input.openDate ?? null,
    address: input.address ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    fiscal_month: input.fiscalMonth ?? null,
    accounting_firm: input.accountingFirm ?? null,
    accountant_name: input.accountantName ?? null,
  };
  if (input.entityType !== undefined) row.entity_type = input.entityType;
  if (input.contactName !== undefined) row.contact_name = input.contactName;
  if (input.vatTaxpayerType !== undefined) row.vat_taxpayer_type = input.vatTaxpayerType;
  if (input.simplifiedVatRate !== undefined) row.simplified_vat_rate = input.simplifiedVatRate;

  if (existing) {
    const { error: updateError } = await supabase.from("clients").update(row).eq("id", existing.id);
    if (updateError) throw new Error(`고객사 갱신 실패: ${updateError.message}`);
    return { id: existing.id, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("clients")
    .insert(row)
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(`고객사 생성 실패: ${insertError?.message}`);
  }
  return { id: inserted.id, created: true };
}
