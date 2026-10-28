import { t } from "../i18n";
import { useState } from "react";
import { useStore } from "../data/store";
import { KINDS, LEASE_LABEL, isoDay, monthKey, rentAt, kindLabel, monthLabel, rentTracker, trackerTotals, type LeaseState, type TrackRow } from "../data/logic";
import { trackerSheet } from "../data/excel";
import type { Kind, Status, Unit } from "../data/types";
import { Money, StatusPill } from "../theme/AppShell";
import { Chips, DemoNote, EmptyState, SectionHead, useToast } from "../ui/kit";
import { save } from "./ExcelPanel";

type KindF = "all" | Kind;
type PayF = "all" | Status | "ahead" | "bills";
type LeaseF = "all" | LeaseState;
const months = (n: number) => (n === 1 ? t("شهر") : n === 2 ? t("شهرين") : n <= 10 ? t("{n} أشهر", { n }) : t("{n} شهر", { n }));

/** ملف متابعة حالة الإيجار (DW-022): مؤشرات + جدول متابعة + الإيجار المقدم */
export function Tracker({ onOpenUnit }: { onOpenUnit: (u: Unit) => void }) {
  const { data } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState<KindF>("all");
  const [building, setBuilding] = useState("all");
  const [pay, setPay] = useState<PayF>("all");
  const [lease, setLease] = useState<LeaseF>("all");

  const all = rentTracker(data);
  const buildings = [...new Set(data.units.map((u) => u.building))];
  const rows = all.filter((r) =>
    (kind === "all" || r.kind === kind) &&
    (building === "all" || r.unit.building === building) &&
    (pay === "all" || (pay === "ahead" ? r.ahead > 0 : pay === "bills" ? r.bills > 0 : r.status === pay)) &&
    (lease === "all" || r.lease === lease));
  const tot = trackerTotals(rows);
  const ahead = rows.filter((r) => r.ahead > 0).sort((a, b) => b.ahead - a.ahead);
  const n = (f: (r: TrackRow) => boolean) => all.filter(f).length;

  const exportXlsx = async () => {
    try {
      await save([trackerSheet(data, new Date(), rows)], `idarati-tracking-${isoDay(new Date())}.xlsx`);
      toast({ text: t("انحفظ ملف المتابعة ({v1} وحدة)", { v1: rows.length }) });
    } catch { toast({ text: t("ما قدرنا نسوي الملف") }); }
  };

  return (
    <div className="stack-lg tracker">
      <div className="grid-3 track-kpis">
        <div className="card kpi"><span className="muted small">{t("الوحدات")}</span><span className="money num">{tot.rented}<span className="muted small"> / {tot.units} {t("مؤجرة")}</span></span></div>
        <div className="card kpi"><span className="muted small">{t("إجمالي المستحق")}</span><Money fils={tot.due} animate /></div>
        <div className="card kpi"><span className="muted small">{t("المسدد")}</span><Money fils={tot.paid} tone="in" animate /></div>
        <div className="card kpi"><span className="muted small">{t("المتبقي")}</span><Money fils={tot.left} tone={tot.left ? "out" : undefined} animate /></div>
        <div className="card kpi"><span className="muted small">{t("مدفوع مقدماً")}</span><Money fils={tot.ahead} tone="in" animate /></div>
        <div className="card kpi"><span className="muted small">{t("فواتير كهرباء وماء غير مسددة")}</span><Money fils={tot.bills} tone={tot.bills ? "out" : undefined} animate /></div>
      </div>

      <section className="card stack track-filters" aria-label={t("تصفية")}>
        <div className="filter-row"><span>{t("النوع")}</span><Chips<KindF> label={t("النوع")} value={kind} onChange={setKind} options={[{ id: "all", label: t("الكل"), count: all.length }, ...KINDS.map((k) => ({ ...k, count: n((r) => r.kind === k.id) })).filter((k) => k.count)]} /></div>
        {buildings.length > 1 && <div className="filter-row"><span>{t("المبنى")}</span><Chips label={t("المبنى")} value={building} onChange={setBuilding} options={[{ id: "all", label: t("الكل") }, ...buildings.map((b) => ({ id: b, label: b }))]} /></div>}
        <div className="filter-row"><span>{t("السداد")}</span><Chips<PayF> label={t("السداد")} value={pay} onChange={setPay} options={[
          { id: "all", label: t("الكل") }, { id: "late", label: t("متأخر"), count: n((r) => r.status === "late") }, { id: "due", label: t("مستحق"), count: n((r) => r.status === "due") },
          { id: "paid", label: t("مسدد"), count: n((r) => r.status === "paid") }, { id: "ahead", label: t("مقدم"), count: n((r) => r.ahead > 0) }, { id: "bills", label: t("فواتير غير مسددة"), count: n((r) => r.bills > 0) }]} /></div>
        <div className="filter-row"><span>{t("العقد")}</span><Chips<LeaseF> label={t("العقد")} value={lease} onChange={setLease} options={[{ id: "all", label: t("الكل") }, ...(["active", "soon", "ended", "open", "vacant"] as LeaseState[]).map((l) => ({ id: l, label: LEASE_LABEL[l], count: n((r) => r.lease === l) })).filter((l) => l.count)]} /></div>
      </section>

      <section className="card">
        <SectionHead title={t("جدول متابعة الإيجار")} action={<button className="link press" onClick={exportXlsx}>{t("تصدير Excel")}</button>} />
        {rows.length === 0 ? <EmptyState text={t("ما فيه وحدات بهالتصفية.")} /> : (
          <div className="tbl-scroll" tabIndex={0} aria-label={t("جدول المتابعة، اسحب يمين ويسار")}>
            <table className="tbl track-tbl" id="track-tbl">
              <thead><tr>
                <th>{t("الوحدة")}</th><th>{t("النوع")}</th><th>{t("المستأجر")}</th><th>{t("الإيجار")}</th><th>{t("المستحق")}</th><th>{t("المسدد")}</th><th>{t("المتبقي")}</th>
                <th>{t("السداد")}</th><th>{t("فواتير")}</th><th>{t("مدفوع لين")}</th><th>{t("مقدم")}</th><th>{t("أيام للنهاية")}</th><th>{t("العقد")}</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.unit.id} className="press" onClick={() => onOpenUnit(r.unit)}>
                    <th scope="row"><span className="strong">{r.unit.name}</span><span className="muted small">{r.unit.building}</span></th>
                    <td>{kindLabel(r.kind)}</td>
                    <td>{r.unit.tenant?.name ?? <span className="muted">—</span>}</td>
                    <td><Money fils={rentAt(r.unit, monthKey(new Date()))} /></td>
                    <td><Money fils={r.due} /></td>
                    <td><Money fils={r.paid} /></td>
                    <td>{r.left ? <Money fils={r.left} tone="out" /> : <span className="muted">—</span>}</td>
                    <td>{r.status ? <StatusPill status={r.status} /> : <span className="muted">—</span>}</td>
                    <td>{r.bills ? <Money fils={r.bills} tone="out" /> : <span className="muted">—</span>}</td>
                    <td>{r.through ? monthLabel(r.through) : <span className="muted">—</span>}</td>
                    <td className="num">{r.ahead ? months(r.ahead) : <span className="muted">—</span>}</td>
                    <td className={`num${r.daysLeft !== null && r.daysLeft < 0 ? " danger-text" : ""}`}>{r.daysLeft ?? <span className="muted">—</span>}</td>
                    <td><span className={`pill lease-${r.lease}`}>{LEASE_LABEL[r.lease]}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <th scope="row">{t("المجموع")}</th><td /><td /><td />
                <td><Money fils={tot.due} /></td><td><Money fils={tot.paid} /></td><td><Money fils={tot.left} /></td>
                <td /><td>{tot.bills ? <Money fils={tot.bills} /> : null}</td><td /><td /><td /><td />
              </tr></tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="ahead-h">
        <SectionHead title={t("الإيجارات المدفوعة مقدماً")} />
        {ahead.length === 0 ? <p className="muted small" style={{ margin: 0 }}>{t("ما فيه إيجار مدفوع مقدم. من شاشة الوحدة ← «دفعة مقدمة» (شهر، 3، 6، أو سنة).")}</p> : (
          <table className="tbl" id="ahead-tbl">
            <thead><tr><th>{t("الوحدة")}</th><th>{t("النوع")}</th><th>{t("مدفوع لين")}</th><th>{t("المدة")}</th><th>{t("المبلغ")}</th></tr></thead>
            <tbody>
              {ahead.map((r) => (
                <tr key={r.unit.id} className="press" onClick={() => onOpenUnit(r.unit)}>
                  <td className="strong">{r.unit.name}</td><td>{kindLabel(r.kind)}</td><td>{r.through ? monthLabel(r.through) : "—"}</td>
                  <td className="num">{months(r.ahead)}</td><td><Money fils={r.aheadAmount} tone="in" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="muted small" style={{ margin: 0 }}>{t("المستحق والمسدد من بداية العقد (أو بداية التتبّع) لين هالشهر. المقدم = أشهر بعد هالشهر مدفوعة كامل. الفواتير يدفعها المستأجر للهيئة وما تدخل بالمستحق. ملف Excel فيه أسماء المستأجرين بدون أرقام هواتف.")}</p>
      <DemoNote />
    </div>
  );
}
