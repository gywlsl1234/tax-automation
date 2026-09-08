"use client";

import { useState } from "react";
import Link from "next/link";
import { formatKstDateTime } from "@/lib/formatDate";

export interface ClientReportSummary {
  id: string;
  baseYear: number;
  reportMonth: number | null;
  status: string;
  createdAt: string;
}

export function ClientReportsPanel({ initialReports }: { initialReports: ClientReportSummary[] }) {
  const [reports, setReports] = useState(initialReports);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (!window.confirm("선택한 리포트를 삭제하시겠습니까? 삭제된 리포트는 복구할 수 없습니다.")) return;

    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      setReports((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
    } catch {
      setError("네트워크 오류로 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (reports.length === 0) {
    return <p style={{ fontSize: 13, color: "#666" }}>등록된 리포트가 없습니다.</p>;
  }

  return (
    <div>
      {error && <p style={{ color: "crimson", fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, marginBottom: 12 }}>
        <thead>
          <tr>
            <th style={th}></th>
            <th style={th}>기준연도</th>
            <th style={th}>기준월</th>
            <th style={th}>상태</th>
            <th style={th}>생성일</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td style={td}>
                <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
              </td>
              <td style={td}>{r.baseYear}년</td>
              <td style={td}>{r.reportMonth ? `${r.reportMonth}월` : "-"}</td>
              <td style={td}>{r.status}</td>
              <td style={td}>{formatKstDateTime(r.createdAt)}</td>
              <td style={td}>
                <Link href={`/admin/reports/${r.id}/preview`} style={{ color: "#2563eb" }}>
                  미리보기 →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={handleDelete}
        disabled={selected.size === 0 || isDeleting}
        style={{
          padding: "6px 14px",
          fontSize: 13,
          background: selected.size > 0 ? "#dc2626" : "#e5e7eb",
          color: selected.size > 0 ? "white" : "#999",
          border: "none",
          borderRadius: 6,
          cursor: selected.size > 0 ? "pointer" : "not-allowed",
        }}
      >
        {isDeleting ? "삭제 중..." : `선택 삭제 (${selected.size})`}
      </button>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #e5e7eb",
  padding: "6px 8px",
  color: "#555",
  fontSize: 12,
};
const td: React.CSSProperties = { borderBottom: "1px solid #f0f0f0", padding: "6px 8px" };
