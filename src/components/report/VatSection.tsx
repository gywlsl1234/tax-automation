"use client";

import { useState } from "react";
import { formatWon } from "@/lib/report/money";
import type { VatPeriodEstimate, VatTaxpayerType } from "@/lib/report/vat";
import { COLORS } from "./colors";

export interface VatOverridePeriodInput {
  label: string;
  salesVat: number;
  purchaseVat: number;
  payableVat: number;
}

export interface VatOverrideInput {
  enabled: boolean;
  periods: VatOverridePeriodInput[] | null;
}

export type OnEditVatOverride = (input: VatOverrideInput) => Promise<void>;

const DISCLAIMER =
  "현재 등록된 매출장·매입장 데이터를 기준으로 환산한 예상 금액이며, 의제매입세액공제·신용카드매출전표발행세액공제 등은 반영되지 않아 실제 신고세액과 차이가 발생할 수 있습니다.";

const SIMPLIFIED_DISCLAIMER =
  "간이과세자 계산구조(매출액 × 업종별 부가가치율 × 10% − 매입액 × 0.5%)로 환산한 예상 금액이며, 실제 신고세액과 차이가 발생할 수 있습니다.";

const DISABLED_REASON: Record<VatTaxpayerType, string> = {
  general: "",
  simplified: "간이과세자는 예상 부가세 계산이 비활성화되어 있습니다.",
  simplified_invoice: "",
  exempt: "면세사업자는 예상 부가세 계산이 비활성화되어 있습니다.",
};

const STATUS_LABEL: Record<VatPeriodEstimate["status"], string> = {
  actual: "실적",
  projected: "예상",
  mixed: "실적+예상",
  manual: "수동 입력",
};

function PeriodCard({ period }: { period: VatPeriodEstimate }) {
  return (
    <div style={{ border: `1px solid ${COLORS.gridline}`, borderRadius: 8, padding: 14, flex: "1 1 200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{period.label}</p>
        <span style={{ fontSize: 11, color: COLORS.muted }}>{STATUS_LABEL[period.status]}</span>
      </div>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.muted }}>
        매출세액 {formatWon(period.salesVat)}원 · 매입세액 {formatWon(period.purchaseVat)}원
      </p>
      <p style={{ margin: 0, fontSize: 12, color: COLORS.muted }}>예상 납부세액</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.vat }}>{formatWon(period.payableVat)}원</p>
    </div>
  );
}

export function VatSection({
  vatEstimate,
  vatOverrideInput,
  onEditVatOverride,
  vatEnabled,
  vatTaxpayerType,
}: {
  vatEstimate: VatPeriodEstimate[];
  vatOverrideInput: VatOverrideInput;
  onEditVatOverride?: OnEditVatOverride;
  vatEnabled: boolean;
  vatTaxpayerType: VatTaxpayerType;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [enabled, setEnabled] = useState(vatOverrideInput.enabled);
  const [drafts, setDrafts] = useState(
    vatEstimate.map((p) => ({ label: p.label, salesVat: String(p.salesVat), purchaseVat: String(p.purchaseVat) }))
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!vatEnabled) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>예상 부가세</h2>
        <p style={{ fontSize: 13, color: COLORS.muted, border: `1px solid ${COLORS.gridline}`, borderRadius: 8, padding: 16, margin: 0 }}>
          {DISABLED_REASON[vatTaxpayerType] || "이 거래처는 예상 부가세 계산이 비활성화되어 있습니다."}
        </p>
      </section>
    );
  }

  function updateDraft(idx: number, field: "salesVat" | "purchaseVat", value: string) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }

  async function save() {
    if (!onEditVatOverride) return;
    setIsSaving(true);
    try {
      await onEditVatOverride({
        enabled,
        periods: drafts.map((d) => {
          const salesVat = Number(d.salesVat) || 0;
          const purchaseVat = Number(d.purchaseVat) || 0;
          return { label: d.label, salesVat, purchaseVat, payableVat: salesVat - purchaseVat };
        }),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>
          예상 부가세{" "}
          {vatTaxpayerType === "simplified_invoice" && (
            <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.muted }}>(간이과세 계산방식 적용)</span>
          )}
        </h2>
        {onEditVatOverride && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              background: "none",
              border: `1px solid ${COLORS.gridline}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            수동 입력 설정
          </button>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            자동 계산 대신 아래 값을 사용
          </label>
          {drafts.map((d, idx) => (
            <div key={d.label} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 600, width: 110 }}>{d.label}</span>
              <label style={{ fontSize: 12, color: COLORS.textSecondary }}>
                매출세액
                <input
                  type="number"
                  value={d.salesVat}
                  disabled={!enabled}
                  onChange={(e) => updateDraft(idx, "salesVat", e.target.value)}
                  style={{ display: "block", padding: "4px 6px", width: 140 }}
                />
              </label>
              <label style={{ fontSize: 12, color: COLORS.textSecondary }}>
                매입세액
                <input
                  type="number"
                  value={d.purchaseVat}
                  disabled={!enabled}
                  onChange={(e) => updateDraft(idx, "purchaseVat", e.target.value)}
                  style={{ display: "block", padding: "4px 6px", width: 140 }}
                />
              </label>
              <span style={{ fontSize: 12, color: COLORS.muted }}>
                납부세액 {formatWon((Number(d.salesVat) || 0) - (Number(d.purchaseVat) || 0))}원
              </span>
            </div>
          ))}
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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {vatEstimate.map((period) => (
            <PeriodCard key={period.label} period={period} />
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: COLORS.muted, margin: 0 }}>
        {vatTaxpayerType === "simplified_invoice" ? SIMPLIFIED_DISCLAIMER : DISCLAIMER}
      </p>
    </section>
  );
}
