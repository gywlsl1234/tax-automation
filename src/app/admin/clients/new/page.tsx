"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    ceoName: "",
    bizRegNo: "",
    entityType: "individual",
    bizType: "",
    bizItem: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    fiscalMonth: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "등록에 실패했습니다.");
        return;
      }
      router.push(`/admin/clients/${json.id}`);
    } catch {
      setError("네트워크 오류로 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/admin/clients">← 고객사 목록으로</Link>
      </p>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>거래처 추가</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        이미 등록된 사업자등록번호를 입력하면 새로 만들지 않고 기존 거래처 정보를 최신 값으로 업데이트합니다.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="거래처명 *" value={form.companyName} onChange={(v) => update("companyName", v)} required />
        <Field label="대표자명 *" value={form.ceoName} onChange={(v) => update("ceoName", v)} required />
        <Field
          label="사업자등록번호 *"
          value={form.bizRegNo}
          onChange={(v) => update("bizRegNo", v)}
          required
          placeholder="123-45-67890"
        />
        <div>
          <label style={labelStyle}>사업자 구분</label>
          <select
            value={form.entityType}
            onChange={(e) => update("entityType", e.target.value)}
            style={{ padding: "6px 8px", fontSize: 14, width: "100%" }}
          >
            <option value="individual">개인사업자</option>
            <option value="corporate">법인사업자</option>
          </select>
        </div>
        <Field label="업태" value={form.bizType} onChange={(v) => update("bizType", v)} />
        <Field label="종목" value={form.bizItem} onChange={(v) => update("bizItem", v)} />
        <Field label="담당자명" value={form.contactName} onChange={(v) => update("contactName", v)} />
        <Field label="연락처" value={form.phone} onChange={(v) => update("phone", v)} />
        <Field label="이메일" value={form.email} onChange={(v) => update("email", v)} type="email" />
        <Field label="소재지" value={form.address} onChange={(v) => update("address", v)} />
        <Field label="결산월" value={form.fiscalMonth} onChange={(v) => update("fiscalMonth", v)} type="number" />

        {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "10px 20px",
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            marginTop: 8,
          }}
        >
          {isSubmitting ? "등록 중..." : "거래처 등록"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 8px", fontSize: 14, width: "100%", boxSizing: "border-box" }}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "#555", marginBottom: 4 };
