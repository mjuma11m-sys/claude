import { useEffect, useState } from "react";
import { useStore } from "../data/store";
import { budget, fmt, monthKey, monthName, parseBHD } from "../data/logic";
import { Money } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { Bar, Chips, DemoNote, SectionHead, Sheet, SkeletonCards, useToast } from "../ui/kit";

export function Budget() {
  const { data, loading } = useStore();
  const stagger = useStagger(loading);
  const b = budget(data);
  const catName = (id: string) => data.cats.find((c) => c.id === id)?.name ?? "";
  const recent = [...data.expenses].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 8);
  const left = b.limit - b.spent;

  return (
    <div className="stack-lg">
      <div className="card summary">
        <div>
          <div className="muted small">صرف {monthName(monthKey(new Date()))}</div>
          <div className="big"><Money fils={b.spent} tone="out" animate /></div>
        </div>
        <div style={{ textAlign: "end" }}>
          <div className="muted small">{left >= 0 ? "باقي" : "متعدّي"}</div>
          <div className="big"><Money fils={Math.abs(left)} tone={left >= 0 ? "in" : "out"} /></div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}><Bar value={b.spent} max={b.limit} /></div>
      </div>

      <section>
        <SectionHead title="الفئات" />
        {loading ? <SkeletonCards n={3} /> : (
          <ul className="rows card-list">
            {b.cats.map((c, i) => {
              const st = stagger(i);
              return (
                <li key={c.id} className={`cat-row ${st.className}`} style={st.style}>
                  <div className="cat-top"><span className="strong">{c.name}</span><span className="small"><Money fils={c.spent} /> <span className="muted">/ {fmt(c.limit)}</span></span></div>
                  <Bar value={c.spent} max={c.limit} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionHead title="آخر المصاريف" />
        <ul className="rows card-list">
          {recent.map((e) => (
            <li key={e.id}><span>{e.label} <span className="muted small">· {catName(e.catId)}</span></span><Money fils={e.amount} tone="out" /></li>
          ))}
        </ul>
      </section>
      <DemoNote />
    </div>
  );
}

export function ExpenseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addExpense, unexpense } = useStore();
  const toast = useToast();
  const [cat, setCat] = useState(data.cats[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setLabel(""); setAmount(""); setError(""); } }, [open]);

  const submit = () => {
    const fils = parseBHD(amount);
    if (!label.trim()) { setError("اكتب وصف المصروف"); return; }
    if (fils === null) { setError("اكتب المبلغ بالدينار، مثل 12.500"); return; }
    const e = addExpense(cat, label.trim(), fils);
    onClose();
    toast({ text: `انضاف مصروف ${fmt(fils)} د.ب`, undo: () => unexpense(e.id) });
  };

  return (
    <Sheet open={open} onClose={onClose} title="مصروف جديد">
      <form className="pay-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor="exp-label" className="strong">الوصف</label>
        <input id="exp-label" className="input" value={label} onChange={(e) => { setLabel(e.target.value); setError(""); }} placeholder="مثال: فاتورة كهرباء" />
        <label htmlFor="exp-amount" className="strong">المبلغ</label>
        <div className="money-input">
          <input id="exp-amount" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} placeholder="0.000" />
          <span>د.ب</span>
        </div>
        <Chips label="الفئة" value={cat} onChange={setCat} options={data.cats.map((c) => ({ id: c.id, label: c.name }))} />
        {error && <div className="field-error">{error}</div>}
        <button type="submit" className="btn btn-block press">أضف المصروف</button>
      </form>
    </Sheet>
  );
}
