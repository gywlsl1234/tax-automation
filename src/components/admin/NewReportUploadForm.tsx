"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";

interface ClientOption {
  id: string;
  companyName: string;
  bizRegNo: string;
}

interface UploadPreview {
  client: {
    id: string;
    companyName: string;
    ceoName: string;
    bizRegNo: string;
  };
  report: {
    id: string;
    baseYear: number;
    reportMonth: number;
    compareYear: number | null;
  };
  preview: {
    incomeStatement: {
      rowCount: number;
      majorCategories: { accountName: string; year: number; month: number; amount: number }[];
    };
    ledger: {
      totalCount: number;
      salesCount: number;
      purchaseCount: number;
      salesSupplyTotal: number;
      purchaseSupplyTotal: number;
    };
  };
}

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

const currentYear = new Date().getFullYear();

export function NewReportUploadForm({ clients }: { clients: ClientOption[] }) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [baseYear, setBaseYear] = useState(currentYear);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [clientInfoFile, setClientInfoFile] = useState<File[]>([]);
  const [incomeStatementFile, setIncomeStatementFile] = useState<File[]>([]);
  const [ledgerFiles, setLedgerFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadPreview | null>(null);

  const isExistingClient = selectedClientId !== "";
  const canSubmit =
    (isExistingClient || clientInfoFile.length === 1) &&
    incomeStatementFile.length === 1 &&
    ledgerFiles.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    if (isExistingClient) formData.set("clientId", selectedClientId);
    if (clientInfoFile[0]) formData.set("clientInfoFile", clientInfoFile[0]);
    formData.set("baseYear", String(baseYear));
    formData.set("reportMonth", String(reportMonth));
    formData.set("incomeStatementFile", incomeStatementFile[0]);
    for (const f of ledgerFiles) formData.append("ledgerFiles", f);

    try {
      const res = await fetch("/api/admin/reports/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "업로드에 실패했습니다.");
        return;
      }
      setResult(json);
    } catch {
      setError("네트워크 오류로 업로드에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>기존 거래처 선택 (선택)</label>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          style={{ padding: "8px 10px", width: "100%", maxWidth: 360 }}
        >
          <option value="">— 신규 거래처 (사업자정보 파일 업로드) —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName} ({c.bizRegNo})
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          기존 거래처를 선택하면 사업자정보 파일 없이, 이번 달 재무데이터 파일만 업로드하면 됩니다.
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>기준연도</label>
          <input
            type="number"
            value={baseYear}
            onChange={(e) => setBaseYear(Number(e.target.value))}
            style={{ padding: "8px 10px", width: 120 }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>기준월</label>
          <select
            value={reportMonth}
            onChange={(e) => setReportMonth(Number(e.target.value))}
            style={{ padding: "8px 10px", width: 120 }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>
      </div>

      <FileDropzone
        label={
          isExistingClient
            ? "사업자정보/보고서설정 파일 (선택 — 비교연도·통화단위·안내문구를 바꿀 때만 첨부)"
            : "1. 사업자정보/보고서설정 파일 (1개, 신규 거래처는 필수)"
        }
        files={clientInfoFile}
        onChange={setClientInfoFile}
      />
      <FileDropzone
        label="2. 기간별(월별) 손익계산서 파일 (1개)"
        files={incomeStatementFile}
        onChange={setIncomeStatementFile}
      />
      <FileDropzone
        label="3. 월별 매입/매출장 파일 (1개 이상, 매입·매출 파일 모두 선택)"
        multiple
        files={ledgerFiles}
        onChange={setLedgerFiles}
      />

      <button
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={handleSubmit}
        style={{
          padding: "10px 20px",
          background: canSubmit ? "#111827" : "#9ca3af",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {isSubmitting ? "업로드 및 파싱 중..." : "업로드하고 파싱하기"}
      </button>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 17 }}>파싱 결과 미리보기</h2>

          <h3 style={{ fontSize: 15, marginTop: 20 }}>고객사</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              <tr>
                <td style={tdLabel}>상호</td>
                <td style={td}>{result.client.companyName}</td>
              </tr>
              <tr>
                <td style={tdLabel}>대표자</td>
                <td style={td}>{result.client.ceoName}</td>
              </tr>
              <tr>
                <td style={tdLabel}>사업자등록번호</td>
                <td style={td}>{result.client.bizRegNo}</td>
              </tr>
              <tr>
                <td style={tdLabel}>기준연도 / 기준월</td>
                <td style={td}>
                  {result.report.baseYear}년 {result.report.reportMonth}월
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: 15, marginTop: 20 }}>
            손익계산서 (총 {result.preview.incomeStatement.rowCount}행 저장)
          </h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>과목</th>
                <th style={th}>연도</th>
                <th style={th}>월</th>
                <th style={{ ...th, textAlign: "right" }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {result.preview.incomeStatement.majorCategories.slice(0, 20).map((row, i) => (
                <tr key={i}>
                  <td style={td}>{row.accountName}</td>
                  <td style={td}>{row.year}</td>
                  <td style={td}>{row.month}</td>
                  <td style={{ ...td, textAlign: "right" }}>{formatNumber(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 15, marginTop: 20 }}>매입/매출장</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              <tr>
                <td style={tdLabel}>총 저장 건수</td>
                <td style={td}>{result.preview.ledger.totalCount}건</td>
              </tr>
              <tr>
                <td style={tdLabel}>매출 건수 / 공급가액 합계</td>
                <td style={td}>
                  {result.preview.ledger.salesCount}건 / {formatNumber(result.preview.ledger.salesSupplyTotal)}원
                </td>
              </tr>
              <tr>
                <td style={tdLabel}>매입 건수 / 공급가액 합계</td>
                <td style={td}>
                  {result.preview.ledger.purchaseCount}건 / {formatNumber(result.preview.ledger.purchaseSupplyTotal)}원
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: 15, marginTop: 20 }}>발행 준비된 보고서</h3>
          <p style={{ fontSize: 14, color: "#555" }}>
            보고서가 저장되었습니다 (report id: {result.report.id}). 미리보기 화면에서 내용을 확인한 뒤
            공유 링크를 발급하세요.
          </p>
          <p>
            <a href={`/admin/reports/${result.report.id}/preview`} style={{ color: "#2563eb" }}>
              보고서 화면 미리보기 및 링크 발급 →
            </a>
          </p>
        </section>
      )}
    </>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #e5e7eb",
  padding: "6px 8px",
  fontSize: 13,
  color: "#555",
};
const td: React.CSSProperties = {
  borderBottom: "1px solid #f0f0f0",
  padding: "6px 8px",
  fontSize: 13,
};
const tdLabel: React.CSSProperties = { ...td, color: "#555", width: 220 };
