import { t } from "../i18n";
import { useState } from "react";
import { MonthReportSheet } from "./MonthReport";
import { useStore } from "../data/store";
import { fmt, isoDay, monthName, monthlyReport, toCSV } from "../data/logic";
import { Money } from "../theme/AppShell";
import { DemoNote, SectionHead, useToast } from "../ui/kit";
import { ExcelPanel } from "./ExcelPanel";
import { VatSummary } from "./VatSummary";
import { YearReport } from "./YearReport";
import { saveFile } from "../native";

/** الدخل مقابل المصروف لآخر 6 أشهر + تصدير CSV للمحاسب */
export function Reports() {
  const { data } = useStore();
  const toast = useToast();
  const [report, setReport] = useState(false);
  const r = monthlyReport(data);
  const max = Math.max(1, ...r.rows.flatMap((x) => [x.income, x.expense]));
  const W = 340, H = 180, pad = 22, slot = (W - pad * 2) / r.rows.length, bw = Math.min(18, slot / 3);
  const y = (v: number) => H - 24 - (v / max) * (H - 50);

  const exportCsv = async () => {
    const name = (id: string) => data.units.find((u) => u.id === id)?.name ?? id;
    const cat = (id: string) => data.cats.find((c) => c.id === id)?.name ?? id;
    const rows: (string | number)[][] = [[t("النوع"), t("التاريخ"), t("الشهر"), t("البيان"), t("المبلغ (د.ب)"), t("الطريقة")]];
    for (const p of data.payments) rows.push([t("إيجار"), p.date, p.month, name(p.unitId), fmt(p.amount), p.method]);
    for (const e of data.expenses) rows.push([t("مصروف"), e.date, e.date.slice(0, 7), `${e.label} · ${cat(e.catId)}${e.building ? ` · ${e.building}` : ""}`, "-" + fmt(e.amount), ""]);
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
    try { await saveFile(`idarati-${isoDay(new Date())}.csv`, blob); } catch { return; }
    toast({ text: t("انحفظ ملف CSV ({v1} سطر)", { v1: rows.length - 1 }) });
  };

  return (
    <div className="stack-lg">
      <div className="grid-3">
        <div className="card kpi"><span className="muted small">{t("دخل 6 أشهر")}</span><Money fils={r.income} tone="in" animate /></div>
        <div className="card kpi"><span className="muted small">{t("مصروف")}</span><Money fils={r.expense} tone="out" animate /></div>
        <div className="card kpi"><span className="muted small">{t("الصافي")}</span><Money fils={r.net} tone={r.net >= 0 ? "in" : "out"} animate /></div>
      </div>

      <section className="card">
        <SectionHead title={t("شهر بشهر")} action={<span className="legend"><i className="lg-in" />{t("دخل")} <i className="lg-out" />{t("مصروف")}</span>} />
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("الدخل والمصروف لآخر 6 أشهر")}>
          <line x1={pad} x2={W - pad} y1={H - 24} y2={H - 24} className="axis" />
          {r.rows.map((m, i) => {
            const cx = W - pad - slot * (i + 0.5); // من اليمين (RTL)
            return (
              <g key={m.month}>
                <rect className="bar-in" x={cx + 1} y={y(m.income)} width={bw} height={H - 24 - y(m.income)} rx="3" style={{ animationDelay: `${i * 60}ms` }} />
                <rect className="bar-out" x={cx - bw - 1} y={y(m.expense)} width={bw} height={H - 24 - y(m.expense)} rx="3" style={{ animationDelay: `${i * 60 + 30}ms` }} />
                <text x={cx} y={H - 8} textAnchor="middle" className="tick">{monthName(m.month).slice(0, 5)}</text>
              </g>
            );
          })}
        </svg>
        <table className="tbl">
          <thead><tr><th>{t("الشهر")}</th><th>{t("دخل")}</th><th>{t("مصروف")}</th><th>{t("صافي")}</th></tr></thead>
          <tbody>
            {[...r.rows].reverse().map((m) => (
              <tr key={m.month}>
                <td>{monthName(m.month)}</td>
                <td><Money fils={m.income} /></td>
                <td><Money fils={m.expense} /></td>
                <td><Money fils={m.net} tone={m.net >= 0 ? "in" : "out"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <YearReport />
      <button className="btn press" id="month-report-btn" onClick={() => setReport(true)}>{t("تقرير الشهر للطباعة")}</button>
      <MonthReportSheet open={report} onClose={() => setReport(false)} />
      <VatSummary />
      <ExcelPanel />
      <button className="btn btn-ghost press" onClick={exportCsv}>{t("تصدير CSV للمحاسب")}</button>
      <p className="muted small" style={{ margin: 0 }}>{t("ملفات Excel وCSV فيها أسماء المستأجرين — لا ترسلها إلا للمحاسب.")}</p>
      <DemoNote />
    </div>
  );
}
