"use client";

import { useState } from "react";
import { COLORS } from "./colors";

export interface TaxEstimate {
  annualizedIncome: number;
  incomeTax: number;
  localIncomeTax: number;
  totalTax: number;
  isManualOverride: boolean;
}

export interface TaxOverrideInput {
  enabled: boolean;
  annualIncome: number | null;
  incomeTax: number | null;
  localTax: number | null;
}

export type OnEditTaxOverride = (input: TaxOverrideInput) => Promise<void>;

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

const DISCLAIMER =
  "위 예상세액은 현재까지의 실적을 기준으로 산출한 참고 금액이며, 향후 매출·비용 및 세액공제·감면 등에 따라 실제 신고세액과 차이가 발생할 수 있습니다.";

export function IncomeTaxSection({
  cumulativeIncome,
  taxEstimate,
  taxOverrideInput,
  onEditTaxOverride,
}: {
  cumulativeIncome: number;
  taxEstimate: TaxEstimate;
  taxOverrideInput: TaxOverrideInput;
  onEditTaxOverride?: OnEditTaxOverride;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [enabled, setEnabled] = useState(taxOverrideInput.enabled);
  const [annualIncome, setAnnualIncome] = useState(String(taxOverrideInput.annualIncome ?? ""));
  const [incomeTax, setIncomeTax] = useState(String(taxOverrideInput.incomeTax ?? ""));
  const [localTax, setLocalTax] = useState(String(taxOverrideInput.localTax ?? ""));
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!onEditTaxOverride) return;
    setIsSaving(true);
    try {
      await onEditTaxOverride({
        enabled,
        annualIncome: annualIncome === "" ? null : Number(annualIncome),
        incomeTax: incomeTax === "" ? null : Number(incomeTax),
        localTax: localTax === "" ? null : Number(localTax),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section style={{ border: `1px solid ${COLORS.gridline}`, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>
          예상 종합소득세 {taxEstimate.isManualOverride && <span style={{ fontSize: 12, color: "#d97706" }}>(수동 입력)</span>}
        </h3>
        {onEditTaxOverride && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{ fontSize: 12, padding: "4px 10px", background: "none", border: `1px solid ${COLORS.gridline}`, borderRadius: 6, cursor: "pointer" }}
          >
            수동 입력 설정
          </button>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            자동 계산 대신 아래 값을 사용
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: COLORS.textSecondary }}>
              예상 연간소득
              <input
                type="number"
                value={annualIncome}
                disabled={!enabled}
                onChange={(e) => setAnnualIncome(e.target.value)}
                style={{ display: "block", padding: "4px 6px", width: 160 }}
              />
            </label>
            <label style={{ fontSize: 12, color: COLORS.textSecondary }}>
              예상 종합소득세
              <input
                type="number"
                value={incomeTax}
                disabled={!enabled}
                onChange={(e) => setIncomeTax(e.target.value)}
                style={{ display: "block", padding: "4px 6px", width: 160 }}
              />
            </label>
            <label style={{ fontSize: 12, color: COLORS.textSecondary }}>
              예상 지방소득세
              <input
                type="number"
                value={localTax}
                disabled={!enabled}
                onChange={(e) => setLocalTax(e.target.value)}
                style={{ display: "block", padding: "4px 6px", width: 160 }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={isSaving} style={{ fontSize: 12, padding: "4px 10px" }}>
              저장
            </button>
            <button onClick={() => setIsEditing(false)} disabled={isSaving} style={{ fontSize: 12, padding: "4px 10px" }}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12, fontSize: 13 }}>
          <div>
            <p style={{ margin: 0, color: COLORS.muted }}>현재까지 누적 소득</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{formatNumber(cumulativeIncome)}원</p>
          </div>
          <div>
            <p style={{ margin: 0, color: COLORS.muted }}>예상 연간소득</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{formatNumber(taxEstimate.annualizedIncome)}원</p>
          </div>
          <div>
            <p style={{ margin: 0, color: COLORS.muted }}>예상 종합소득세</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{formatNumber(taxEstimate.incomeTax)}원</p>
          </div>
          <div>
            <p style={{ margin: 0, color: COLORS.muted }}>예상 지방소득세</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{formatNumber(taxEstimate.localIncomeTax)}원</p>
          </div>
          <div>
            <p style={{ margin: 0, color: COLORS.muted }}>예상 총 납부세액</p>
            <p style={{ margin: 0, fontWeight: 700, color: COLORS.profit }}>{formatNumber(taxEstimate.totalTax)}원</p>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: COLORS.muted, margin: 0 }}>{DISCLAIMER}</p>
    </section>
  );
}
