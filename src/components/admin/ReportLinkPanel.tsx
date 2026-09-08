"use client";

import { useState } from "react";
import { formatKstDateTime } from "@/lib/formatDate";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("아래 링크를 복사하세요:", text);
    }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "2px 8px",
        fontSize: 12,
        background: copied ? "#d1fae5" : "#f3f4f6",
        color: copied ? "#065f46" : "#111827",
        border: "1px solid #e5e7eb",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

export interface ReportLinkSummary {
  id: string;
  linkToken: string;
  status: "active" | "revoked";
  failCount: number;
  createdAt: string;
  revokedAt: string | null;
  expiresAt: string;
}

interface IssueResult {
  url: string;
  defaultPassword: string;
}

type DisplayStatus = "active" | "expired" | "revoked";

/** DB의 status(active/revoked)와 expires_at을 조합한 화면 표시용 상태 — "만료"는
 * 별도 컬럼 없이 현재 시각과 expires_at을 비교해 그때그때 계산한다. */
function displayStatus(link: Pick<ReportLinkSummary, "status" | "expiresAt">): DisplayStatus {
  if (link.status === "revoked") return "revoked";
  if (new Date(link.expiresAt).getTime() < Date.now()) return "expired";
  return "active";
}

const STATUS_LABEL: Record<DisplayStatus, string> = { active: "사용중", expired: "만료", revoked: "폐기" };
const STATUS_COLOR: Record<DisplayStatus, { color: string; background: string }> = {
  active: { color: "#065f46", background: "#d1fae5" },
  expired: { color: "#78350f", background: "#fef3c7" },
  revoked: { color: "#7f1d1d", background: "#fee2e2" },
};

function statusBadge(link: Pick<ReportLinkSummary, "status" | "expiresAt">) {
  const status = displayStatus(link);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        ...STATUS_COLOR[status],
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ReportLinkPanel({ reportId, initialLinks }: { reportId: string; initialLinks: ReportLinkSummary[] }) {
  const [links, setLinks] = useState(initialLinks);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState<IssueResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeLink = links.find((l) => l.status === "active");

  async function handleIssue() {
    const confirmMsg = activeLink
      ? "기존 링크는 즉시 폐기되고 새 링크가 발급됩니다. 계속할까요?"
      : "새 공유 링크를 발급할까요?";
    if (!window.confirm(confirmMsg)) return;

    setIsIssuing(true);
    setError(null);
    setIssueResult(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/links`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "링크 발급에 실패했습니다.");
        return;
      }
      setIssueResult({ url: json.url, defaultPassword: json.defaultPassword });
      setLinks((prev) => [
        {
          id: json.linkToken,
          linkToken: json.linkToken,
          status: "active" as const,
          failCount: 0,
          createdAt: json.createdAt,
          expiresAt: json.expiresAt,
          revokedAt: null,
        },
        ...prev.map((l) => (l.status === "active" ? { ...l, status: "revoked" as const } : l)),
      ]);
    } catch {
      setError("네트워크 오류로 링크 발급에 실패했습니다.");
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>공유 링크</h3>
        <button
          onClick={handleIssue}
          disabled={isIssuing}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: isIssuing ? "not-allowed" : "pointer",
          }}
        >
          {isIssuing ? "발급 중..." : activeLink ? "새 링크 재발급" : "링크 발급"}
        </button>
      </div>

      {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}

      {issueResult && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 6,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <p style={{ margin: "0 0 4px", fontWeight: 600 }}>새 링크가 발급되었습니다 (지금만 표시됩니다)</p>
          <p style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
            URL: <code>{issueResult.url}</code>
            <CopyButton text={issueResult.url} />
          </p>
          <p style={{ margin: 0 }}>
            기본 비밀번호: <code>{issueResult.defaultPassword}</code>{" "}
            (사업자등록번호 뒤 5자리 — 고객에게 이 값을 안내해주세요)
          </p>
        </div>
      )}

      {links.length === 0 ? (
        <p style={{ fontSize: 13, color: "#666" }}>발급된 링크가 없습니다.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>상태</th>
              <th style={th}>토큰</th>
              <th style={th}>실패 횟수</th>
              <th style={th}>발급 시각</th>
              <th style={th}>만료일</th>
              <th style={th}>폐기 시각</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td style={td}>{statusBadge(l)}</td>
                <td style={{ ...td, fontFamily: "monospace" }}>{l.linkToken.slice(0, 12)}...</td>
                <td style={td}>{l.failCount} / 5</td>
                <td style={td}>{formatKstDateTime(l.createdAt)}</td>
                <td style={td}>{formatKstDateTime(l.expiresAt)}</td>
                <td style={td}>{l.revokedAt ? formatKstDateTime(l.revokedAt) : "-"}</td>
                <td style={td}>
                  {displayStatus(l) === "active" && (
                    <CopyButton
                      text={`${typeof window !== "undefined" ? window.location.origin : ""}/r/${l.linkToken}`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
