import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { upsertClientByBizRegNo } from "@/lib/clients/upsertClient";

/** 거래처 단건 등록(관리자 폼 입력). 이미 있는 사업자등록번호면 최신 정보로 갱신한다
 * (거래처 일괄 업로드와 동일한 upsert 정책 — upsertClientByBizRegNo 재사용). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const companyName = String(body.companyName ?? "").trim();
  const ceoName = String(body.ceoName ?? "").trim();
  const bizRegNoRaw = String(body.bizRegNo ?? "").trim();
  const bizRegNoDigits = bizRegNoRaw.replace(/\D/g, "");

  if (!companyName || !ceoName || !bizRegNoRaw) {
    return NextResponse.json({ error: "거래처명, 대표자명, 사업자등록번호는 필수입니다." }, { status: 400 });
  }
  if (!/^\d{10}$/.test(bizRegNoDigits)) {
    return NextResponse.json({ error: "사업자등록번호 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const entityType = body.entityType === "corporate" ? "corporate" : "individual";

  try {
    const result = await upsertClientByBizRegNo({
      companyName,
      ceoName,
      bizRegNo: bizRegNoRaw,
      entityType,
      bizType: body.bizType || null,
      bizItem: body.bizItem || null,
      contactName: body.contactName || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      fiscalMonth: body.fiscalMonth ? Number(body.fiscalMonth) : null,
    });
    return NextResponse.json({ id: result.id, created: result.created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "거래처 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
