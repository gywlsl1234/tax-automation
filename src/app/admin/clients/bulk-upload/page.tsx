"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDropzone } from "@/components/FileDropzone";

interface BulkUploadResult {
  total: number;
  created: number;
  updated: number;
  errorCount: number;
  errors: { row: number; reason: string }[];
}

export default function ClientsBulkUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  async function handleSubmit() {
    if (files.length !== 1) return;
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.set("file", files[0]);

    try {
      const res = await fetch("/api/admin/clients/bulk-upload", { method: "POST", body: formData });
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
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/admin/clients">← 고객사 목록으로</Link>
      </p>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>거래처 일괄 업로드</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        엑셀 1행은 헤더, 2행부터 거래처 데이터입니다. 이미 등록된 사업자등록번호는 최신 정보로
        덮어씁니다(업데이트). 신규 사업자등록번호는 새 거래처로 등록됩니다.
      </p>
      <p style={{ marginBottom: 16 }}>
        {/* 페이지가 아니라 파일 다운로드용 API 라우트라서 next/link가 아닌 일반 링크를 쓴다. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/admin/clients/bulk-upload/template" style={{ color: "#2563eb", fontSize: 14 }}>
          샘플 엑셀 양식 다운로드 →
        </a>
      </p>

      <FileDropzone label="거래처 목록 엑셀 (1개)" files={files} onChange={(f) => setFiles(f.slice(0, 1))} />

      <button
        type="button"
        disabled={files.length !== 1 || isSubmitting}
        onClick={handleSubmit}
        style={{
          padding: "10px 20px",
          background: files.length === 1 ? "#111827" : "#9ca3af",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: files.length === 1 ? "pointer" : "not-allowed",
        }}
      >
        {isSubmitting ? "업로드 중..." : "업로드"}
      </button>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 17, marginBottom: 12 }}>업로드 결과</h2>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
            <tbody>
              <tr>
                <td style={tdLabel}>전체 업로드 건수</td>
                <td style={td}>{result.total}건</td>
              </tr>
              <tr>
                <td style={tdLabel}>신규 등록 건수</td>
                <td style={td}>{result.created}건</td>
              </tr>
              <tr>
                <td style={tdLabel}>기존 거래처(업데이트) 건수</td>
                <td style={td}>{result.updated}건</td>
              </tr>
              <tr>
                <td style={tdLabel}>오류 건수</td>
                <td style={{ ...td, color: result.errorCount > 0 ? "crimson" : undefined }}>
                  {result.errorCount}건
                </td>
              </tr>
            </tbody>
          </table>

          {result.errors.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>오류 상세</h3>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={th}>행</th>
                    <th style={th}>사유</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td style={td}>{e.row}</td>
                      <td style={{ ...td, color: "crimson" }}>{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #e5e7eb",
  padding: "6px 8px",
  fontSize: 13,
  color: "#555",
};
const td: React.CSSProperties = { borderBottom: "1px solid #f0f0f0", padding: "6px 8px", fontSize: 13 };
const tdLabel: React.CSSProperties = { ...td, color: "#555", width: 240 };
