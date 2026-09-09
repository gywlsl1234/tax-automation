import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readWorkbookFromFile } from "@/lib/parsers/readWorkbook";
import { parseClientsBulkSheet } from "@/lib/parsers/clientsBulkParser";
import { upsertClientByBizRegNo } from "@/lib/clients/upsertClient";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "엑셀 파일을 첨부해주세요." }, { status: 400 });
  }

  try {
    const workbook = await readWorkbookFromFile(file);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: "업로드한 파일에서 시트를 찾을 수 없습니다." }, { status: 400 });
    }

    const { rows, issues } = parseClientsBulkSheet(sheet);
    const errors: { row: number; reason: string }[] = issues.map((i) => ({ row: i.row, reason: i.message }));

    let created = 0;
    let updated = 0;
    for (const row of rows) {
      try {
        const result = await upsertClientByBizRegNo({
          companyName: row.companyName,
          ceoName: row.ceoName,
          bizRegNo: row.bizRegNo,
          entityType: row.entityType,
          vatTaxpayerType: row.vatTaxpayerType,
          simplifiedVatRate: row.simplifiedVatRate,
          bizType: row.bizType,
          bizItem: row.bizItem,
          contactName: row.contactName,
          phone: row.phone,
          email: row.email,
          address: row.address,
          fiscalMonth: row.fiscalMonth,
        });
        if (result.created) created += 1;
        else updated += 1;
      } catch (err) {
        errors.push({
          row: row.row,
          reason: err instanceof Error ? err.message : "알 수 없는 오류로 저장에 실패했습니다.",
        });
      }
    }

    return NextResponse.json({
      total: rows.length + issues.length,
      created,
      updated,
      errorCount: errors.length,
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 처리 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
