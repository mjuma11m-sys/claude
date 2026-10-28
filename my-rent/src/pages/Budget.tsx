import { isEn, t } from "../i18n";
import { useEffect, useState } from "react";
import { useStore } from "../data/store";
import { budget, dueRecurring, fmt, monthKey, monthName, parseBHD } from "../data/logic";
import { Money } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { Bar, Chips, DemoNote, SectionHead, Sheet, SkeletonCards, useToast } from "../ui/kit";

export function Budget() {
  const { data, loading, logRecurring, unexpenses, removeRecurring, addRecurring } = useStore();
  const toast = useToast();
  const pending = dueRecurring(data);
  const recurring = data.recurring ?? [];
  const logAll = () => {
    const items = logRecurring();
    if (items.length) toast({ text: t("انسجلت {v1} مصاريف ثابتة · {v2} د.ب", { v1: items.length, v2: fmt(items.reduce((s, e) => s + e.amount, 0)) }), undo: () => unexpenses(items.map((e) => e.id)) });
  };
  const stagger = useStagger(loading);
  const b = budget(data);
  const catName = (id: string) => data.cats.find((c) => c.id === id)?.name ?? "";
  const recent = [...data.expenses].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 8);
  const left = b.limit - b.spent;

  return (
    <div className="stack-lg">
      <div className="card summary">
        <div>
          <div className="muted small">{t("صرف")} {monthName(monthKey(new Date()))}</div>
          <div className="big"><Money fils={b.spent} tone="out" animate /></div>
        </div>
        <div style={{ textAlign: "end" }}>
          <div className="muted small">{left >= 0 ? (isEn() ? "Left" : "باقي") : t("متعدّي")}</div>
          <div className="big"><Money fils={Math.abs(left)} tone={left >= 0 ? "in" : "out"} /></div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}><Bar value={b.spent} max={b.limit} /></div>
      </div>

      {pending.length > 0 && (
        <div className="nudge nudge-gold" role="status">
          <span><b className="num">{pending.length}</b> {t("مصاريف ثابتة لـ")}{monthName(monthKey(new Date()))} · <span className="num">{fmt(pending.reduce((s, r) => s + r.amount, 0))}</span> {t("د.ب")}</span>
          <button className="btn btn-sm press" onClick={logAll}>{t("سجّلها كلها")}</button>
        </div>
      )}

      <section>
        <SectionHead title={t("الفئات")} />
        {loading ? <SkeletonCards n={3} /> : (
          <ul className="rows card-list">
            {b.cats.map((c, i) => {
              const st = stagger(i);
              return (
                <li key={c.id} className={`cat-row ${st.className}`} style={st.style}>
                  <div className="cat-top"><span className="strong">{c.name}</span><span className="small"><Money fils={c.spent} /> <span className="muted">/ {fmt(c.limit)}</span></span></div>
                  <Bar value={c.spent} max={c.limit} label={t("مصروف {v1} من حدّه", { v1: c.name })} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionHead title={t("آخر المصاريف")} />
        <ul className="rows card-list">
          {recent.map((e) => (
            <li key={e.id}><span>{e.label} <span className="muted small">· {catName(e.catId)}</span></span><Money fils={e.amount} tone="out" /></li>
          ))}
        </ul>
      </section>
      {recurring.length > 0 && (
        <section>
          <SectionHead title={t("المصاريف الثابتة")} />
          <ul className="rows card-list">
            {recurring.map((r) => (
              <li key={r.id}>
                <span>{r.label} <span className="muted small">· {catName(r.catId)}</span></span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Money fils={r.amount} />
                  <button className="icon-x press" aria-label={t("وقّف تكرار {v1}", { v1: r.label })} onClick={() => { removeRecurring(r.id); toast({ text: t("{v1} ما عاد يتكرر", { v1: r.label }), undo: () => addRecurring(r.catId, r.label, r.amount) }); }}>×</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <DemoNote />
    </div>
  );
}

export function ExpenseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addExpense, unexpense, addRecurring, removeRecurring } = useStore();
  const [repeat, setRepeat] = useState(false);
  const toast = useToast();
  const [cat, setCat] = useState(data.cats[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [building, setBuilding] = useState(""); // DW-043: العقار (اختياري) للتقرير السنوي
  const buildings = [...new Set(data.units.map((u) => u.building).filter(Boolean))];
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setLabel(""); setAmount(""); setError(""); setRepeat(false); setBuilding(""); } }, [open]);

  const submit = () => {
    const fils = parseBHD(amount);
    if (!label.trim()) { setError(t("اكتب وصف المصروف")); return; }
    if (fils === null) { setError(t("اكتب المبلغ بالدينار، مثل 12.500")); return; }
    const e = addExpense(cat, label.trim(), fils, building || undefined);
    const r = repeat ? addRecurring(cat, label.trim(), fils) : null;
    onClose();
    toast({ text: t("انضاف مصروف {v1} د.ب{v2}", { v1: fmt(fils), v2: r ? " · يتكرر كل شهر" : "" }), undo: () => { unexpense(e.id); if (r) removeRecurring(r.id); } });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("مصروف جديد")}>
      <form className="pay-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor="exp-label" className="strong">{t("الوصف")}</label>
        <input id="exp-label" className="input" value={label} onChange={(e) => { setLabel(e.target.value); setError(""); }} placeholder={t("مثال: فاتورة كهرباء")} />
        <label htmlFor="exp-amount" className="strong">{t("المبلغ")}</label>
        <div className="money-input">
          <input id="exp-amount" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} placeholder="0.000" />
          <span>{t("د.ب")}</span>
        </div>
        <Chips label={t("الفئة")} value={cat} onChange={setCat} options={data.cats.map((c) => ({ id: c.id, label: c.name }))} />
        {buildings.length > 0 && <Chips label={t("العقار (اختياري)")} value={building} onChange={setBuilding} options={[{ id: "", label: t("بدون") }, ...buildings.map((b) => ({ id: b, label: b }))]} />}
        <label className="check-row"><input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> {t("يتكرر كل شهر (فاتورة، إنترنت…)")}</label>
        {error && <div className="field-error">{error}</div>}
        <button type="submit" className="btn btn-block press">{t("أضف المصروف")}</button>
      </form>
    </Sheet>
  );
}
