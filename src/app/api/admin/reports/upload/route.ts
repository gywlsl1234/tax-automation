import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readWorkbookFromFile } from "@/lib/parsers/readWorkbook";
import { parseClientInfoSheet, parseReportSettingsSheet } from "@/lib/parsers/clientInfoParser";
import { parseIncomeStatementSheet } from "@/lib/parsers/incomeStatementParser";
import { parseLedgerSheet } from "@/lib/parsers/ledgerParser";
import { upsertClientByBizRegNo } from "@/lib/clients/upsertClient";
import type { ParsedReportSettings } from "@/lib/parsers/types";

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
  const existingClientIdRaw = formData.get("clientId");
  const existingClientId =
    typeof existingClientIdRaw === "string" && existingClientIdRaw.trim() !== "" ? existingClientIdRaw : null;

  const baseYear = Number(formData.get("baseYear"));
  const reportMonth = Number(formData.get("reportMonth"));

  if (!existingClientId && !(clientInfoFile instanceof File)) {
    return NextResponse.json(
      { error: "신규 거래처는 사업자정보 파일이 필수입니다. 기존 거래처를 선택하거나 파일을 첨부해주세요." },
      { status: 400 }
    );
  }
  if (!(incomeStatementFile instanceof File)) {
    return NextResponse.json({ error: "손익계산서 파일은 필수입니다." }, { status: 400 });
  }
  if (ledgerFiles.length === 0 || !ledgerFiles.every((f) => f instanceof File)) {
    return NextResponse.json(
      { error: "매입/매출장 파일을 1개 이상 업로드해야 합니다." },
      { status: 400 }
    );
  }
  if (!Number.isInteger(baseYear) || baseYear < 2000 || baseYear > 2100) {
    return NextResponse.json({ error: "기준연도를 올바르게 입력해주세요." }, { status: 400 });
  }
  if (!Number.isInteger(reportMonth) || reportMonth < 1 || reportMonth > 12) {
    return NextResponse.json({ error: "기준월을 1~12 사이에서 선택해주세요." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();

    // 보고서설정(비교연도/통화단위/안내문구)은 파일이 있을 때만 읽는다. 기준연도는
    // 화면에서 입력한 값을 항상 우선한다(파일값과 두 군데서 다르게 들어오는 혼란을
    // 없애기 위함).
    let reportSettings: Omit<ParsedReportSettings, "baseYear"> = {
      compareYear: null,
      currencyUnit: "원",
      publicDays: null,
      usePassword: false,
      password: null,
      logoFileName: null,
      publisherName: null,
      customerNotice: null,
    };
    let clientInfoFromFile: Awaited<ReturnType<typeof parseClientInfoSheet>> | null = null;

    if (clientInfoFile instanceof File) {
      const clientInfoWb = await readWorkbookFromFile(clientInfoFile);
      const clientInfoSheet = clientInfoWb.getWorksheet("사업자정보");
      const reportSettingsSheet = clientInfoWb.getWorksheet("보고서설정");
      if (!clientInfoSheet || !reportSettingsSheet) {
        return NextResponse.json(
          { error: '업로드한 파일에서 "사업자정보" 또는 "보고서설정" 시트를 찾을 수 없습니다.' },
          { status: 400 }
        );
      }
      clientInfoFromFile = parseClientInfoSheet(clientInfoSheet);
      const parsedSettings = parseReportSettingsSheet(reportSettingsSheet);
      reportSettings = {
        compareYear: parsedSettings.compareYear,
        currencyUnit: parsedSettings.currencyUnit,
        publicDays: parsedSettings.publicDays,
        usePassword: parsedSettings.usePassword,
        password: parsedSettings.password,
        logoFileName: parsedSettings.logoFileName,
        publisherName: parsedSettings.publisherName,
        customerNotice: parsedSettings.customerNotice,
      };
    }

    const incomeStatementWb = await readWorkbookFromFile(incomeStatementFile);
    const incomeItems = parseIncomeStatementSheet(incomeStatementWb.worksheets[0]);

    const ledgerEntries = [];
    for (const file of ledgerFiles as File[]) {
      const wb = await readWorkbookFromFile(file);
      ledgerEntries.push(...parseLedgerSheet(wb.worksheets[0]));
    }

    // 거래처 확정: 기존 거래처를 선택했으면 그 거래처를 그대로 쓰고(사업자정보
    // 파일이 같이 왔더라도 정체성 충돌을 피하기 위해 무시), 아니면 사업자등록번호
    // 기준으로 upsert한다(기존 로직과 동일, 여러 upsert 경로가 upsertClientByBizRegNo
    // 하나로 통일됨).
    let clientId: string;
    if (existingClientId) {
      const { data: existingClientRow, error } = await supabase
        .from("clients")
        .select("id")
        .eq("id", existingClientId)
        .maybeSingle();
      if (error || !existingClientRow) {
        return NextResponse.json({ error: "선택한 거래처를 찾을 수 없습니다." }, { status: 404 });
      }
      clientId = existingClientRow.id;
    } else if (clientInfoFromFile) {
      const { id } = await upsertClientByBizRegNo({
        companyName: clientInfoFromFile.companyName,
        ceoName: clientInfoFromFile.ceoName,
        bizRegNo: clientInfoFromFile.bizRegNo,
        bizType: clientInfoFromFile.bizType,
        bizItem: clientInfoFromFile.bizItem,
        openDate: clientInfoFromFile.openDate,
        address: clientInfoFromFile.address,
        phone: clientInfoFromFile.phone,
        email: clientInfoFromFile.email,
        fiscalMonth: clientInfoFromFile.fiscalMonth,
        accountingFirm: clientInfoFromFile.accountingFirm,
        accountantName: clientInfoFromFile.accountantName,
      });
      clientId = id;
    } else {
      // 위 필수값 검증에서 이미 걸러지므로 도달하지 않는다.
      throw new Error("거래처 정보를 확인할 수 없습니다.");
    }

    // 같은 (거래처, 기준연도, 기준월) 조합의 보고서가 이미 있으면 새로 만들지 않고
    // 그 보고서의 세부 데이터만 갈아끼운다 — report_id가 유지되므로 이미 발급된
    // 공유 링크(report_links)는 그대로 살아있는다.
    const { data: existingReport } = await supabase
      .from("reports")
      .select("id")
      .eq("client_id", clientId)
      .eq("base_year", baseYear)
      .eq("report_month", reportMonth)
      .maybeSingle();

    let reportId: string;
    if (existingReport) {
      reportId = existingReport.id;
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          compare_year: reportSettings.compareYear,
          currency_unit: reportSettings.currencyUnit,
        })
        .eq("id", reportId);
      if (updateError) throw new Error(`보고서 갱신 실패: ${updateError.message}`);

      const [{ error: delIncomeError }, { error: delLedgerError }, { error: delNoteError }] = await Promise.all([
        supabase.from("income_statement_items").delete().eq("report_id", reportId),
        supabase.from("ledger_entries").delete().eq("report_id", reportId),
        supabase.from("report_notes").delete().eq("report_id", reportId).eq("section", "memo"),
      ]);
      if (delIncomeError) throw new Error(`기존 손익계산서 삭제 실패: ${delIncomeError.message}`);
      if (delLedgerError) throw new Error(`기존 매입/매출장 삭제 실패: ${delLedgerError.message}`);
      if (delNoteError) throw new Error(`기존 안내 문구 삭제 실패: ${delNoteError.message}`);
    } else {
      const { data: insertedReport, error: reportError } = await supabase
        .from("reports")
        .insert({
          client_id: clientId,
          base_year: baseYear,
          report_month: reportMonth,
          compare_year: reportSettings.compareYear,
          currency_unit: reportSettings.currencyUnit,
          status: "draft",
        })
        .select("id")
        .single();
      if (reportError || !insertedReport) {
        throw new Error(`보고서 생성 실패: ${reportError?.message}`);
      }
      reportId = insertedReport.id;
    }

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

    // 응답에 보여줄 거래처 정보는 항상 DB의 최신 값을 다시 읽어 온다(기존 거래처를
    // 선택해 파일 없이 업로드한 경우에도 화면에 상호/대표자 등이 정상 표시되도록).
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, company_name, ceo_name, biz_reg_no")
      .eq("id", clientId)
      .single();

    return NextResponse.json({
      client: {
        id: clientId,
        companyName: clientRow?.company_name ?? clientInfoFromFile?.companyName ?? "",
        ceoName: clientRow?.ceo_name ?? clientInfoFromFile?.ceoName ?? "",
        bizRegNo: clientRow?.biz_reg_no ?? clientInfoFromFile?.bizRegNo ?? "",
      },
      report: { id: reportId, baseYear, reportMonth, ...reportSettings },
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
