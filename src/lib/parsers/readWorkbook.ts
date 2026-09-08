import ExcelJS from "exceljs";

export async function readWorkbookFromFile(file: File): Promise<ExcelJS.Workbook> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  // exceljs가 자체적으로 선언하는 전역 Buffer 타입이 최신 @types/node의 제네릭
  // Buffer와 병합되며 충돌해 발생하는 타입 오류라 런타임 동작에는 영향 없음.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  return workbook;
}
