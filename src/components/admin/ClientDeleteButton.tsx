"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClientDeleteButton({ clientId, companyName }: { clientId: string; companyName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `"${companyName}" 거래처를 삭제하시겠습니까?\n\n이 거래처의 모든 리포트, 손익계산서, 매입/매출장, 공유 링크가 함께 삭제되며 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      router.push("/admin/clients");
    } catch {
      setError("네트워크 오류로 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        style={{
          padding: "6px 14px",
          fontSize: 13,
          background: "#fee2e2",
          color: "#7f1d1d",
          border: "1px solid #fecaca",
          borderRadius: 6,
          cursor: isDeleting ? "not-allowed" : "pointer",
        }}
      >
        {isDeleting ? "삭제 중..." : "거래처 삭제"}
      </button>
      {error && <p style={{ color: "crimson", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
