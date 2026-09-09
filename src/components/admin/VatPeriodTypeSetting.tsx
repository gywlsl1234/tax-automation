"use client";

import { useState } from "react";

const LABELS: Record<"semiannual" | "quarterly", string> = {
  semiannual: "반기 (1기/2기, 2회)",
  quarterly: "분기 (1~4분기, 4회)",
};

export function VatPeriodTypeSetting({
  clientId,
  initialValue,
}: {
  clientId: string;
  initialValue: "semiannual" | "quarterly";
}) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: "semiannual" | "quarterly") {
    if (next === value) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/vat-period-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vatPeriodType: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "저장에 실패했습니다.");
        return;
      }
      setValue(next);
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <select
        value={value}
        disabled={isSaving}
        onChange={(e) => handleChange(e.target.value as "semiannual" | "quarterly")}
        style={{ padding: "4px 8px", fontSize: 13 }}
      >
        <option value="semiannual">{LABELS.semiannual}</option>
        <option value="quarterly">{LABELS.quarterly}</option>
      </select>
      {isSaving && <span style={{ fontSize: 12, color: "#888" }}>저장 중...</span>}
      {error && <span style={{ fontSize: 12, color: "crimson" }}>{error}</span>}
    </div>
  );
}
