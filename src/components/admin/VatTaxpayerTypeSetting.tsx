"use client";

import { useState } from "react";

export type VatTaxpayerType = "general" | "simplified" | "simplified_invoice" | "exempt";

const LABELS: Record<VatTaxpayerType, string> = {
  general: "일반과세자",
  simplified: "간이과세자 (부가세 계산 비활성화)",
  simplified_invoice: "간이과세자(세금계산서발급)",
  exempt: "면세사업자 (부가세 계산 비활성화)",
};

const NEEDS_RATE = (t: VatTaxpayerType) => t === "simplified" || t === "simplified_invoice";

export function VatTaxpayerTypeSetting({
  clientId,
  initialType,
  initialRate,
}: {
  clientId: string;
  initialType: VatTaxpayerType;
  initialRate: number | null;
}) {
  const [type, setType] = useState<VatTaxpayerType>(initialType);
  const [rate, setRate] = useState(initialRate !== null ? String(initialRate) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextType: VatTaxpayerType, nextRate: string) {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/vat-taxpayer-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vatTaxpayerType: nextType, simplifiedVatRate: nextRate === "" ? null : nextRate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "저장에 실패했습니다.");
        return;
      }
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleTypeChange(next: VatTaxpayerType) {
    setType(next);
    save(next, rate);
  }

  function handleRateBlur() {
    save(type, rate);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <select
        value={type}
        disabled={isSaving}
        onChange={(e) => handleTypeChange(e.target.value as VatTaxpayerType)}
        style={{ padding: "4px 8px", fontSize: 13 }}
      >
        {(Object.keys(LABELS) as VatTaxpayerType[]).map((t) => (
          <option key={t} value={t}>
            {LABELS[t]}
          </option>
        ))}
      </select>
      {NEEDS_RATE(type) && (
        <label style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>
          부가가치율
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            onBlur={handleRateBlur}
            disabled={isSaving}
            style={{ width: 70, padding: "3px 6px", fontSize: 13 }}
          />
          %
        </label>
      )}
      {isSaving && <span style={{ fontSize: 12, color: "#888" }}>저장 중...</span>}
      {error && <span style={{ fontSize: 12, color: "crimson" }}>{error}</span>}
    </div>
  );
}
