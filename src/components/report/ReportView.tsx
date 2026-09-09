"use client";

import { useState } from "react";
import { formatKstDateTime } from "@/lib/formatDate";
import { buildReportTitle } from "@/lib/report/reportTitle";
import type { CompositionSlice, VendorTotal } from "@/lib/report/aggregate";
import type { IncomeStatementAccountRow } from "@/lib/report/types";
import { COLORS } from "./colors";
import { KpiCard } from "./KpiCard";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { CumulativeLineChart } from "./CumulativeLineChart";
import { CompositionDonut } from "./CompositionDonut";
import { VendorTable } from "./VendorTable";
import { IncomeStatementTable, type OnEditIncomeCell } from "./IncomeStatementTable";
import { IncomeTaxSection, type OnEditTaxOverride, type TaxEstimate, type TaxOverrideInput } from "./IncomeTaxSection";
import {
  CorporateTaxSection,
  type OnEditCorpTaxOverride,
  type CorpTaxEstimate,
  type CorpTaxOverrideInput,
} from "./CorporateTaxSection";
import { VatSection, type OnEditVatOverride, type VatOverrideInput } from "./VatSection";
import type { VatPeriodEstimate, VatTaxpayerType } from "@/lib/report/vat";
import { generateInsights } from "@/lib/report/insights";
import { projectRemainingMonths } from "@/lib/report/projection";
import { InsightList } from "./InsightList";
import styles from "./ReportView.module.css";

export interface LedgerAnalysis {
  monthly: number[];
  cumulative: number[];
  composition: CompositionSlice[];
  topVendors: VendorTotal[];
}

export interface ReportNote {
  id: string;
  section: string;
  content: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface ReportViewData {
  client: {
    companyName: string;
    ceoName: string;
    bizRegNo: string;
    /** 개인사업자(individual)일 때만 예상 종합소득세 섹션을 노출한다. */
    entityType: "individual" | "corporate";
    /** 예상 부가세를 반기(2개 기간) 또는 분기(4개 기간) 기준으로 보여줄지. */
    vatPeriodType: "semiannual" | "quarterly";
    /** 일반과세자/간이과세자/간이과세자(세금계산서발급)/면세사업자. */
    vatTaxpayerType: VatTaxpayerType;
    /** 간이과세자(세금계산서발급) 계산에 쓰이는 업종별 부가가치율(%). 그 외 유형은 null. */
    simplifiedVatRate: number | null;
  };
  report: { baseYear: number; reportMonth: number | null; compareYear: number | null; currencyUnit: string };
  incomeGrid: { major: IncomeStatementAccountRow[]; detail: IncomeStatementAccountRow[] };
  sales: LedgerAnalysis;
  purchase: LedgerAnalysis;
  notes: ReportNote[];
  /**
   * compare_year 데이터가 없으면 null — 이 경우 전년 대비 표시를 생략한다.
   * 손익계산서 기반 "요약" 탭에서만 사용한다 — 매입/매출장은 전기 데이터가
   * 없는 경우가 많아 매출분석/매입분석 탭에는 전기대비를 표시하지 않는다.
   */
  compareIncomeMajor: IncomeStatementAccountRow[] | null;
  /** 당기 데이터가 입력된 마지막 달 (동기간 비교 라벨 표시용, 1~12). 없으면 12. */
  lastMonth: number;
  /** 기준연도 중 실제 매출/매입 실적이 처음 잡힌 달(1~12). 연중 개업한 신규
   * 사업자가 아니거나, 개업월부터 곧바로 실적이 있으면 등록된 개업월과 같다.
   * 미래월 예상치/연환산 세액·부가세 계산에서 실적 없는 달을 분모에서 제외하는 데 쓴다. */
  firstOperatingMonth: number;
  /** 예상 종합소득세 계산에 쓰인 누적 당기순이익. */
  cumulativeIncome: number;
  taxEstimate: TaxEstimate;
  taxOverrideInput: TaxOverrideInput;
  corpTaxEstimate: CorpTaxEstimate;
  corpTaxOverrideInput: CorpTaxOverrideInput;
  /** vatTaxpayerType에 따라 예상 부가세 계산을 노출할지(일반과세자/간이과세자(세금계산서발급)만 true). */
  vatEnabled: boolean;
  vatEstimate: VatPeriodEstimate[];
  vatOverrideInput: VatOverrideInput;
  /** 부가세 수동입력을 끌 때 자동계산으로 되돌리기 위해 관리자 화면(AdminReportPreview)에서만 사용한다. */
  monthlySalesVat: number[];
  monthlyPurchaseVat: number[];
  /** 제공되면 손익계산서 셀/메모/종합소득세·법인세·부가세 수동입력이 편집 가능해진다 (관리자 화면 전용, 고객 화면에는 넘기지 않는다). */
  onEditIncomeCell?: OnEditIncomeCell;
  onEditNote?: (noteId: string, newContent: string) => Promise<void>;
  onEditTaxOverride?: OnEditTaxOverride;
  onEditCorpTaxOverride?: OnEditCorpTaxOverride;
  onEditVatOverride?: OnEditVatOverride;
}

const TABS = ["요약", "손익계산서", "매출분석", "매입분석", "예상 부가세", "담당자 메모"] as const;
type Tab = (typeof TABS)[number];

function findMajor(major: IncomeStatementAccountRow[], keyword: string): IncomeStatementAccountRow | null {
  return major.find((r) => r.accountName.includes(keyword)) ?? null;
}

export function ReportView({
  client,
  report,
  incomeGrid,
  sales,
  purchase,
  notes,
  compareIncomeMajor,
  lastMonth,
  firstOperatingMonth,
  cumulativeIncome,
  taxEstimate,
  taxOverrideInput,
  corpTaxEstimate,
  corpTaxOverrideInput,
  vatEnabled,
  vatEstimate,
  vatOverrideInput,
  onEditIncomeCell,
  onEditNote,
  onEditTaxOverride,
  onEditCorpTaxOverride,
  onEditVatOverride,
}: ReportViewData) {
  const [tab, setTab] = useState<Tab>("요약");

  const salesTotal = findMajor(incomeGrid.major, "매출액");
  const operatingProfit = findMajor(incomeGrid.major, "영업이익");
  const netIncome = findMajor(incomeGrid.major, "당기순이익");
  const purchaseTotal = purchase.monthly.reduce((s, v) => s + v, 0);
  // 매입장 자체가 업로드되지 않은 경우(0원과 구분)를 판단하는 근거로, 구성비/거래처
  // 데이터가 하나도 없으면 "매입 데이터 없음"으로 본다.
  const hasPurchaseData = purchase.composition.length > 0 || purchase.topVendors.length > 0;

  const compareLabel = report.compareYear
    ? lastMonth < 12
      ? `${report.compareYear}년 1~${lastMonth}월`
      : `${report.compareYear}년`
    : "전년";
  const compareTotal = (keyword: string) =>
    compareIncomeMajor ? (findMajor(compareIncomeMajor, keyword)?.total ?? 0) : undefined;

  // 아직 실적이 안 잡힌(=예상으로 채워진) 기간 중 가장 가까운 것을 "다음 예상 부가세"
  // KPI로 보여준다. 전부 실적이면(연말 마감) 마지막 기간을 그대로 보여준다.
  const upcomingVatPeriod = vatEstimate.find((p) => p.status !== "actual") ?? vatEstimate[vatEstimate.length - 1];

  const grossProfit = findMajor(incomeGrid.major, "매출총이익");
  const topVendorRatio =
    sales.topVendors[0] && salesTotal && salesTotal.total > 0
      ? sales.topVendors[0].totalAmount / salesTotal.total
      : null;
  const insights = generateInsights({
    salesTotal: salesTotal?.total ?? 0,
    salesCompare: compareTotal("매출액"),
    operatingProfit: operatingProfit?.total ?? 0,
    operatingProfitCompare: compareTotal("영업이익"),
    netIncome: netIncome?.total ?? 0,
    grossProfitRatio: grossProfit && salesTotal?.total ? grossProfit.total / salesTotal.total : null,
    operatingProfitRatio: operatingProfit && salesTotal?.total ? operatingProfit.total / salesTotal.total : null,
    topVendorRatio,
    upcomingVat: upcomingVatPeriod ? { label: upcomingVatPeriod.label, payableVat: upcomingVatPeriod.payableVat } : null,
    firstOperatingMonth,
  });

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 960, margin: "0 auto" }}>
      <header className={styles.header} style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>
          {client.companyName} {buildReportTitle(report.reportMonth)}
        </h1>
        <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>
          대표자 {client.ceoName} · 사업자등록번호 {client.bizRegNo} · 기준연도 {report.baseYear}
          {report.reportMonth ? ` · 기준월 ${report.reportMonth}월` : ""}
        </p>
      </header>

      <nav className={styles.tabNav} style={{ borderBottom: `1px solid ${COLORS.gridline}`, marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={styles.tabButton}
            style={{
              padding: "10px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              whiteSpace: "nowrap",
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
          <div className={styles.kpiGrid}>
            <KpiCard
              label="매출액"
              value={salesTotal ? salesTotal.total : null}
              compareValue={compareTotal("매출액")}
              compareLabel={compareLabel}
              accentColor={COLORS.sales}
              goodDirection="up"
            />
            <KpiCard
              label="매입액"
              value={hasPurchaseData ? purchaseTotal : null}
              accentColor={COLORS.purchase}
              goodDirection="down"
            />
            <KpiCard
              label="영업이익"
              value={operatingProfit ? operatingProfit.total : null}
              compareValue={compareTotal("영업이익")}
              compareLabel={compareLabel}
              accentColor={COLORS.profit}
              goodDirection="up"
            />
            <KpiCard
              label="당기순이익"
              value={netIncome ? netIncome.total : null}
              compareValue={compareTotal("당기순이익")}
              compareLabel={compareLabel}
              accentColor={COLORS.profit}
              goodDirection="up"
            />
            {upcomingVatPeriod && (
              <KpiCard
                label={`예상 부가세 (${upcomingVatPeriod.months[0]}~${upcomingVatPeriod.months[upcomingVatPeriod.months.length - 1]}월)`}
                value={upcomingVatPeriod.payableVat}
                accentColor={COLORS.vat}
              />
            )}
          </div>
          <div className={styles.chartGrid}>
            <MonthlyBarChart
              title="월별 매출액"
              monthly={projectRemainingMonths(salesTotal?.monthly ?? new Array(12).fill(0), lastMonth, firstOperatingMonth)}
              color={COLORS.sales}
              lastMonth={lastMonth}
            />
            <MonthlyBarChart
              title="월별 영업이익"
              monthly={projectRemainingMonths(
                operatingProfit?.monthly ?? new Array(12).fill(0),
                lastMonth,
                firstOperatingMonth
              )}
              color={COLORS.profit}
              lastMonth={lastMonth}
            />
          </div>
          <InsightList insights={insights} />
          {client.entityType === "individual" ? (
            <IncomeTaxSection
              cumulativeIncome={cumulativeIncome}
              taxEstimate={taxEstimate}
              taxOverrideInput={taxOverrideInput}
              onEditTaxOverride={onEditTaxOverride}
            />
          ) : (
            <CorporateTaxSection
              cumulativeIncome={cumulativeIncome}
              taxEstimate={corpTaxEstimate}
              taxOverrideInput={corpTaxOverrideInput}
              onEditCorpTaxOverride={onEditCorpTaxOverride}
            />
          )}
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>담당자 메모</h3>
            {notes.length === 0 ? (
              <p style={{ color: COLORS.muted, fontSize: 13 }}>등록된 메모가 없습니다.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {notes.map((note) => (
                  <EditableNote key={note.id} note={note} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {tab === "손익계산서" && (
        <IncomeStatementTable
          major={incomeGrid.major}
          detail={incomeGrid.detail}
          onEditCell={onEditIncomeCell}
          baseYear={report.baseYear}
          lastMonth={lastMonth}
        />
      )}

      {/* 매입/매출장은 전기 데이터가 업로드되지 않는 경우가 많아(당기만 관리),
          여기서는 전기대비 비교를 표시하지 않는다 — 손익계산서 기반의 "요약" 탭만
          비교를 보여준다. */}
      {tab === "매출분석" && <LedgerAnalysisSection title="매출" color={COLORS.sales} data={sales} />}

      {tab === "매입분석" && <LedgerAnalysisSection title="매입" color={COLORS.purchase} data={purchase} />}

      {tab === "예상 부가세" && (
        <VatSection
          vatEstimate={vatEstimate}
          vatOverrideInput={vatOverrideInput}
          onEditVatOverride={onEditVatOverride}
          vatEnabled={vatEnabled}
          vatTaxpayerType={client.vatTaxpayerType}
        />
      )}

      {tab === "담당자 메모" && (
        <section>
          {notes.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 14 }}>등록된 메모가 없습니다.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {notes.map((note) => (
                <EditableNote key={note.id} note={note} onEditNote={onEditNote} />
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
      <div className={styles.chartGrid}>
        <MonthlyBarChart title={`월별 ${title}`} monthly={data.monthly} color={color} />
        <CumulativeLineChart title={`누적 ${title}`} cumulative={data.cumulative} color={color} />
      </div>
      <CompositionDonut title={`${title} 구성비 (계정과목별)`} data={data.composition} />
      <VendorTable title={`거래처 Top${data.topVendors.length}`} vendors={data.topVendors} />
    </section>
  );
}

function EditableNote({
  note,
  onEditNote,
}: {
  note: ReportNote;
  onEditNote?: (noteId: string, newContent: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.content ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!onEditNote) return;
    setIsSaving(true);
    try {
      await onEditNote(note.id, draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <li style={{ border: `1px solid ${COLORS.gridline}`, borderRadius: 8, padding: "12px 16px" }}>
      <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 6px" }}>
        [{note.section}] {note.updatedBy ?? "관리자"} · {formatKstDateTime(note.updatedAt)}
      </p>
      {isEditing ? (
        <>
          <textarea
            value={draft}
            disabled={isSaving}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              fontSize: 14,
              padding: 8,
              border: `1px solid ${COLORS.gridline}`,
              borderRadius: 6,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={save} disabled={isSaving} style={{ fontSize: 12, padding: "4px 10px" }}>
              저장
            </button>
            <button
              onClick={() => {
                setDraft(note.content ?? "");
                setIsEditing(false);
              }}
              disabled={isSaving}
              style={{ fontSize: 12, padding: "4px 10px" }}
            >
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14, whiteSpace: "pre-wrap", margin: 0 }}>{note.content}</p>
          {onEditNote && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                fontSize: 12,
                padding: "2px 8px",
                marginTop: 6,
                color: COLORS.profit,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              수정
            </button>
          )}
        </>
      )}
    </li>
  );
}
