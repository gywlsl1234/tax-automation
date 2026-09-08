import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readWorkbookFromFile } from "@/lib/parsers/readWorkbook";
import { parseClientInfoSheet, parseReportSettingsSheet } from "@/lib/parsers/clientInfoParser";
import { parseIncomeStatementSheet } from "@/lib/parsers/incomeStatementParser";
import { parseLedgerSheet } from "@/lib/parsers/ledgerParser";

const BATCH_SIZE = 500;

async function insertInBatches(table: string, rows: Record<string, unknown>[]) {
  const supabase = getSupabaseAdminClient();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      throw new Error(`${table} 저장 실패: ${error.message}`);
    }
  }
}

export async function POST(request: Request) {
  // 프록시(src/proxy.ts)가 1차로 세션을 확인하지만, 라우트 핸들러 내부에서도
  // 이중으로 세션을 검증한다 (Next.js 권장 사항: proxy 하나에만 의존하지 말 것).
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const clientInfoFile = formData.get("clientInfoFile");
  const incomeStatementFile = formData.get("incomeStatementFile");
  const ledgerFiles = formData.getAll("ledgerFiles");

  if (!(clientInfoFile instanceof File) || !(incomeStatementFile instanceof File)) {
    return NextResponse.json(
      { error: "사업자정보 파일과 손익계산서 파일은 필수입니다." },
      { status: 400 }
    );
  }
  if (ledgerFiles.length === 0 || !ledgerFiles.every((f) => f instanceof File)) {
    return NextResponse.json(
      { error: "매입/매출장 파일을 1개 이상 업로드해야 합니다." },
      { status: 400 }
    );
  }

  try {
    const clientInfoWb = await readWorkbookFromFile(clientInfoFile);
    const clientInfoSheet = clientInfoWb.getWorksheet("사업자정보");
    const reportSettingsSheet = clientInfoWb.getWorksheet("보고서설정");
    if (!clientInfoSheet || !reportSettingsSheet) {
      return NextResponse.json(
        { error: '업로드한 파일에서 "사업자정보" 또는 "보고서설정" 시트를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }
    const clientInfo = parseClientInfoSheet(clientInfoSheet);
    const reportSettings = parseReportSettingsSheet(reportSettingsSheet);

    const incomeStatementWb = await readWorkbookFromFile(incomeStatementFile);
    const incomeItems = parseIncomeStatementSheet(incomeStatementWb.worksheets[0]);

    const ledgerEntries = [];
    for (const file of ledgerFiles as File[]) {
      const wb = await readWorkbookFromFile(file);
      ledgerEntries.push(...parseLedgerSheet(wb.worksheets[0]));
    }

    const supabase = getSupabaseAdminClient();

    // 사업자등록번호로 기존 고객사가 있으면 갱신, 없으면 새로 생성한다.
    const { data: existingClient, error: findError } = await supabase
      .from("clients")
      .select("id")
      .eq("biz_reg_no", clientInfo.bizRegNo)
      .maybeSingle();
    if (findError) throw new Error(`고객사 조회 실패: ${findError.message}`);

    const clientRow = {
      company_name: clientInfo.companyName,
      ceo_name: clientInfo.ceoName,
      biz_reg_no: clientInfo.bizRegNo,
      biz_type: clientInfo.bizType,
      biz_item: clientInfo.bizItem,
      open_date: clientInfo.openDate,
      address: clientInfo.address,
      phone: clientInfo.phone,
      email: clientInfo.email,
      fiscal_month: clientInfo.fiscalMonth,
      accounting_firm: clientInfo.accountingFirm,
      accountant_name: clientInfo.accountantName,
    };

    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
      const { error: updateError } = await supabase
        .from("clients")
        .update(clientRow)
        .eq("id", clientId);
      if (updateError) throw new Error(`고객사 갱신 실패: ${updateError.message}`);
    } else {
      const { data: insertedClient, error: insertError } = await supabase
        .from("clients")
        .insert(clientRow)
        .select("id")
        .single();
      if (insertError || !insertedClient) {
        throw new Error(`고객사 생성 실패: ${insertError?.message}`);
      }
      clientId = insertedClient.id;
    }

    // 공유 링크/비밀번호 발급은 이 업로드 단계에서 하지 않는다. 관리자가 미리보기
    // 화면에서 데이터를 확인한 뒤 "링크 발급" 버튼을 눌러야 report_links가
    // 생성된다 (POST /api/admin/reports/[id]/links).
    const { data: insertedReport, error: reportError } = await supabase
      .from("reports")
      .insert({
        client_id: clientId,
        base_year: reportSettings.baseYear,
        compare_year: reportSettings.compareYear,
        currency_unit: reportSettings.currencyUnit,
        status: "draft",
      })
      .select("id")
      .single();
    if (reportError || !insertedReport) {
      throw new Error(`보고서 생성 실패: ${reportError?.message}`);
    }
    const reportId = insertedReport.id;

    if (reportSettings.customerNotice) {
      const { error: noteError } = await supabase.from("report_notes").insert({
        report_id: reportId,
        section: "memo",
        content: reportSettings.customerNotice,
        updated_by: session.user.email ?? "admin",
      });
      if (noteError) throw new Error(`안내 문구 저장 실패: ${noteError.message}`);
    }

    await insertInBatches(
      "income_statement_items",
      incomeItems.map((item) => ({
        report_id: reportId,
        year: item.year,
        account_name: item.accountName,
        month: item.month,
        amount: item.amount,
      }))
    );

    await insertInBatches(
      "ledger_entries",
      ledgerEntries.map((entry) => ({
        report_id: reportId,
        year: entry.year,
        entry_type: entry.entryType,
        entry_date: entry.entryDate,
        entry_no: entry.entryNo,
        vendor: entry.vendor,
        vendor_reg_no: entry.vendorRegNo,
        item_name: entry.itemName,
        supply_amount: entry.supplyAmount,
        vat_amount: entry.vatAmount,
        total_amount: entry.totalAmount,
        account_name: entry.accountName,
        card_company: entry.cardCompany,
        card_number: entry.cardNumber,
      }))
    );

    const salesTotal = ledgerEntries
      .filter((e) => e.entryType === "매출")
      .reduce((sum, e) => sum + (e.supplyAmount ?? 0), 0);
    const purchaseTotal = ledgerEntries
      .filter((e) => e.entryType === "매입")
      .reduce((sum, e) => sum + (e.supplyAmount ?? 0), 0);

    return NextResponse.json({
      client: { id: clientId, ...clientInfo },
      report: { id: reportId, ...reportSettings },
      preview: {
        incomeStatement: {
          rowCount: incomeItems.length,
          majorCategories: incomeItems.filter((i) => i.isMajorCategory),
        },
        ledger: {
          totalCount: ledgerEntries.length,
          salesCount: ledgerEntries.filter((e) => e.entryType === "매출").length,
          purchaseCount: ledgerEntries.filter((e) => e.entryType === "매입").length,
          salesSupplyTotal: salesTotal,
          purchaseSupplyTotal: purchaseTotal,
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 처리 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
