"use client";

import { useState } from "react";
import type { CompositionSlice, VendorTotal } from "@/lib/report/aggregate";
import type { IncomeStatementAccountRow } from "@/lib/report/types";
import { COLORS } from "./colors";
import { KpiCard } from "./KpiCard";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { CumulativeLineChart } from "./CumulativeLineChart";
import { CompositionDonut } from "./CompositionDonut";
import { VendorTable } from "./VendorTable";
import { IncomeStatementTable } from "./IncomeStatementTable";

export interface LedgerAnalysis {
  monthly: number[];
  cumulative: number[];
  composition: CompositionSlice[];
  topVendors: VendorTotal[];
}

export interface ReportNote {
  section: string;
  content: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface ReportViewData {
  client: { companyName: string; ceoName: string; bizRegNo: string };
  report: { baseYear: number; compareYear: number | null; currencyUnit: string };
  incomeGrid: { major: IncomeStatementAccountRow[]; detail: IncomeStatementAccountRow[] };
  sales: LedgerAnalysis;
  purchase: LedgerAnalysis;
  notes: ReportNote[];
}

const TABS = ["요약", "손익계산서", "매출분석", "매입분석", "담당자 메모"] as const;
type Tab = (typeof TABS)[number];

function findMajor(major: IncomeStatementAccountRow[], keyword: string): IncomeStatementAccountRow | null {
  return major.find((r) => r.accountName.includes(keyword)) ?? null;
}

export function ReportView({ client, report, incomeGrid, sales, purchase, notes }: ReportViewData) {
  const [tab, setTab] = useState<Tab>("요약");

  const salesTotal = findMajor(incomeGrid.major, "매출액");
  const costTotal = findMajor(incomeGrid.major, "매출원가");
  const sgaTotal = findMajor(incomeGrid.major, "판매비와 관리비");
  const operatingProfit = findMajor(incomeGrid.major, "영업이익");
  const netIncome = findMajor(incomeGrid.major, "당기순이익");

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>{client.companyName} 재무보고서</h1>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>
          대표자 {client.ceoName} · 사업자등록번호 {client.bizRegNo} · 기준연도 {report.baseYear}
        </p>
      </header>

      <nav style={{ display: "flex", gap: 4, borderBottom: `1px solid ${COLORS.gridline}`, marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? COLORS.textPrimary : COLORS.textSecondary,
              borderBottom: tab === t ? `2px solid ${COLORS.profit}` : "2px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "요약" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <KpiCard label="매출액" value={salesTotal?.total ?? 0} accentColor={COLORS.sales} />
            <KpiCard label="매출원가" value={costTotal?.total ?? 0} accentColor={COLORS.muted} />
            <KpiCard label="판매비와 관리비" value={sgaTotal?.total ?? 0} accentColor={COLORS.purchase} />
            <KpiCard label="영업이익" value={operatingProfit?.total ?? 0} accentColor={COLORS.profit} />
            <KpiCard label="당기순이익" value={netIncome?.total ?? 0} accentColor={COLORS.profit} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <MonthlyBarChart title="월별 매출액" monthly={salesTotal?.monthly ?? new Array(12).fill(0)} color={COLORS.sales} />
            <MonthlyBarChart
              title="월별 영업이익"
              monthly={operatingProfit?.monthly ?? new Array(12).fill(0)}
              color={COLORS.profit}
            />
          </div>
        </section>
      )}

      {tab === "손익계산서" && <IncomeStatementTable major={incomeGrid.major} detail={incomeGrid.detail} />}

      {tab === "매출분석" && (
        <LedgerAnalysisSection title="매출" color={COLORS.sales} data={sales} />
      )}

      {tab === "매입분석" && (
        <LedgerAnalysisSection title="매입" color={COLORS.purchase} data={purchase} />
      )}

      {tab === "담당자 메모" && (
        <section>
          {notes.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 14 }}>등록된 메모가 없습니다.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {notes.map((note, idx) => (
                <li
                  key={idx}
                  style={{
                    border: `1px solid ${COLORS.gridline}`,
                    borderRadius: 8,
                    padding: "12px 16px",
                  }}
                >
                  <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 6px" }}>
                    [{note.section}] {note.updatedBy ?? "관리자"} ·{" "}
                    {new Date(note.updatedAt).toLocaleString("ko-KR")}
                  </p>
                  <p style={{ fontSize: 14, whiteSpace: "pre-wrap", margin: 0 }}>{note.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function LedgerAnalysisSection({
  title,
  color,
  data,
}: {
  title: string;
  color: string;
  data: LedgerAnalysis;
}) {
  const total = data.monthly.reduce((s, v) => s + v, 0);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <KpiCard label={`${title} 합계`} value={total} accentColor={color} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <MonthlyBarChart title={`월별 ${title}`} monthly={data.monthly} color={color} />
        <CumulativeLineChart title={`누적 ${title}`} cumulative={data.cumulative} color={color} />
      </div>
      <CompositionDonut title={`${title} 구성비 (계정과목별)`} data={data.composition} />
      <VendorTable title={`거래처 Top${data.topVendors.length}`} vendors={data.topVendors} />
    </section>
  );
}
