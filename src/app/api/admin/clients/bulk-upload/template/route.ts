import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const HEADERS = [
  "거래처명",
  "대표자명",
  "사업자등록번호",
  "사업자구분(개인/법인)",
  "과세유형(일반과세자/간이과세자/간이과세자(세금계산서발급)/면세사업자)",
  "부가가치율(간이과세자 전용, %)",
  "업태",
  "종목",
  "개업일자(YYYY-MM-DD)",
  "담당자명",
  "연락처",
  "이메일",
  "소재지",
  "결산월",
];

const EXAMPLE_ROW = [
  "예시상사",
  "홍길동",
  "123-45-67890",
  "개인",
  "일반과세자",
  "",
  "서비스업",
  "소프트웨어 개발",
  "2024-04-01",
  "김담당",
  "010-1234-5678",
  "example@company.com",
  "서울특별시 강남구",
  "12",
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("거래처목록");
  sheet.addRow(HEADERS);
  sheet.addRow(EXAMPLE_ROW);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="clients_bulk_upload_sample.xlsx"',
    },
  });
}
