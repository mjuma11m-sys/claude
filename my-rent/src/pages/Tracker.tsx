import { useState } from "react";
import { useStore } from "../data/store";
import { KINDS, LEASE_LABEL, isoDay, monthKey, rentAt, kindLabel, monthLabel, rentTracker, trackerTotals, type LeaseState, type TrackRow } from "../data/logic";
import { trackerSheet } from "../data/excel";
import type { Kind, Status, Unit } from "../data/types";
import { Money, StatusPill } from "../theme/AppShell";
import { Chips, DemoNote, EmptyState, SectionHead, useToast } from "../ui/kit";
import { save } from "./ExcelPanel";

type KindF = "all" | Kind;
type PayF = "all" | Status | "ahead";
type LeaseF = "all" | LeaseState;
const months = (n: number) => (n === 1 ? "شهر" : n === 2 ? "شهرين" : n <= 10 ? `${n} أشهر` : `${n} شهر`);

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
    (pay === "all" || (pay === "ahead" ? r.ahead > 0 : r.status === pay)) &&
    (lease === "all" || r.lease === lease));
  const t = trackerTotals(rows);
  const ahead = rows.filter((r) => r.ahead > 0).sort((a, b) => b.ahead - a.ahead);
  const n = (f: (r: TrackRow) => boolean) => all.filter(f).length;

  const exportXlsx = async () => {
    try {
      await save([trackerSheet(data, new Date(), rows)], `idarati-tracking-${isoDay(new Date())}.xlsx`);
      toast({ text: `انحفظ ملف المتابعة (${rows.length} وحدة)` });
    } catch { toast({ text: "ما قدرنا نسوي الملف" }); }
  };

  return (
    <div className="stack-lg tracker">
      <div className="grid-3 track-kpis">
        <div className="card kpi"><span className="muted small">الوحدات</span><span className="money num">{t.rented}<span className="muted small"> / {t.units} مؤجرة</span></span></div>
        <div className="card kpi"><span className="muted small">إجمالي المستحق</span><Money fils={t.due} animate /></div>
        <div className="card kpi"><span className="muted small">المسدد</span><Money fils={t.paid} tone="in" animate /></div>
        <div className="card kpi"><span className="muted small">المتبقي</span><Money fils={t.left} tone={t.left ? "out" : undefined} animate /></div>
        <div className="card kpi"><span className="muted small">مدفوع مقدماً</span><Money fils={t.ahead} tone="in" animate /></div>
      </div>

      <section className="card stack track-filters" aria-label="تصفية">
        <div className="filter-row"><span>النوع</span><Chips<KindF> label="النوع" value={kind} onChange={setKind} options={[{ id: "all", label: "الكل", count: all.length }, ...KINDS.map((k) => ({ ...k, count: n((r) => r.kind === k.id) })).filter((k) => k.count)]} /></div>
        {buildings.length > 1 && <div className="filter-row"><span>المبنى</span><Chips label="المبنى" value={building} onChange={setBuilding} options={[{ id: "all", label: "الكل" }, ...buildings.map((b) => ({ id: b, label: b }))]} /></div>}
        <div className="filter-row"><span>السداد</span><Chips<PayF> label="السداد" value={pay} onChange={setPay} options={[
          { id: "all", label: "الكل" }, { id: "late", label: "متأخر", count: n((r) => r.status === "late") }, { id: "due", label: "مستحق", count: n((r) => r.status === "due") },
          { id: "paid", label: "مسدد", count: n((r) => r.status === "paid") }, { id: "ahead", label: "مقدم", count: n((r) => r.ahead > 0) }]} /></div>
        <div className="filter-row"><span>العقد</span><Chips<LeaseF> label="العقد" value={lease} onChange={setLease} options={[{ id: "all", label: "الكل" }, ...(["active", "soon", "ended", "open", "vacant"] as LeaseState[]).map((l) => ({ id: l, label: LEASE_LABEL[l], count: n((r) => r.lease === l) })).filter((l) => l.count)]} /></div>
      </section>

      <section className="card">
        <SectionHead title="جدول متابعة الإيجار" action={<button className="link press" onClick={exportXlsx}>تصدير Excel</button>} />
        {rows.length === 0 ? <EmptyState text="ما فيه وحدات بهالتصفية." /> : (
          <div className="tbl-scroll" tabIndex={0} aria-label="جدول المتابعة، اسحب يمين ويسار">
            <table className="tbl track-tbl" id="track-tbl">
              <thead><tr>
                <th>الوحدة</th><th>النوع</th><th>المستأجر</th><th>الإيجار</th><th>المستحق</th><th>المسدد</th><th>المتبقي</th>
                <th>السداد</th><th>مدفوع لين</th><th>مقدم</th><th>أيام للنهاية</th><th>العقد</th>
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
                    <td>{r.through ? monthLabel(r.through) : <span className="muted">—</span>}</td>
                    <td className="num">{r.ahead ? months(r.ahead) : <span className="muted">—</span>}</td>
                    <td className={`num${r.daysLeft !== null && r.daysLeft < 0 ? " danger-text" : ""}`}>{r.daysLeft ?? <span className="muted">—</span>}</td>
                    <td><span className={`pill lease-${r.lease}`}>{LEASE_LABEL[r.lease]}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <th scope="row">المجموع</th><td /><td /><td />
                <td><Money fils={t.due} /></td><td><Money fils={t.paid} /></td><td><Money fils={t.left} /></td>
                <td /><td /><td /><td /><td />
              </tr></tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="ahead-h">
        <SectionHead title="الإيجارات المدفوعة مقدماً" />
        {ahead.length === 0 ? <p className="muted small" style={{ margin: 0 }}>ما فيه إيجار مدفوع مقدم. من شاشة الوحدة ← «دفعة مقدمة» (شهر، 3، 6، أو سنة).</p> : (
          <table className="tbl" id="ahead-tbl">
            <thead><tr><th>الوحدة</th><th>النوع</th><th>مدفوع لين</th><th>المدة</th><th>المبلغ</th></tr></thead>
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
      <p className="muted small" style={{ margin: 0 }}>المستحق والمسدد من بداية العقد (أو بداية التتبّع) لين هالشهر. المقدم = أشهر بعد هالشهر مدفوعة كامل. ملف Excel فيه أسماء المستأجرين بدون أرقام هواتف.</p>
      <DemoNote />
    </div>
  );
}
