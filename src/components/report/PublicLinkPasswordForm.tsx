"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublicLinkPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/report-links/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "비밀번호가 올바르지 않습니다.");
        setPassword("");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "100px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>보고서 열람 비밀번호</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        보고서를 발급한 회계(세무)사무소로부터 안내받은 비밀번호를 입력해주세요.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          style={{ padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 6 }}
        />
        {error && <p style={{ color: "crimson", fontSize: 13, margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "10px 16px",
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "확인 중..." : "열람하기"}
        </button>
      </form>
    </main>
  );
}
