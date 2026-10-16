import { useState } from "react";
import type { Unit } from "../data/types";
import { useStore } from "../data/store";
import { CHEQUE_LABEL, chequeSeries, fmt, isoDay, monthKey, parseBHD, rentAt, unitCheques } from "../data/logic";
import { Money } from "../theme/AppShell";
import { Chips, useToast } from "../ui/kit";

type N = "1" | "6" | "12";
const pillOf = { held: "pill-due", deposited: "pill-paid", returned: "pill-late" } as const;

/** DW-029: الشيكات المؤجلة بشاشة الوحدة — «عندي» ما يصير دفعة إلا لما تودعه */
export function ChequesBox({ unit }: { unit: Unit }) {
  const { data, addCheques, depositCheque, returnCheque, removeCheque, setCheque } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState<N>("1");
  const [f, setF] = useState({ number: "", bank: "", amount: fmt(rentAt(unit, monthKey(new Date()))), due: isoDay(new Date()) });
  const [error, setError] = useState("");
  const list = unitCheques(data, unit.id);
  const held = list.filter((c) => c.state === "held");

  const add = () => {
    const amount = parseBHD(f.amount);
    if (!f.number.trim()) return setError("اكتب رقم الشيك");
    if (amount === null) return setError("اكتب المبلغ بالدينار");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.due)) return setError("اختار تاريخ الاستحقاق");
    const cs = addCheques(unit.id, chequeSeries({ number: f.number.trim(), bank: f.bank.trim(), amount, due: f.due }, Number(n)));
    setOpen(false); setError(""); setF({ ...f, number: "" });
    toast({ text: cs.length > 1 ? `انضافت ${cs.length} شيكات` : `انضاف شيك ${cs[0].number}`, undo: () => cs.forEach((c) => removeCheque(c.id)) });
  };

  return (
    <div className="bills-box stack" id="cheques-box">
      <div className="kv-row">
        <span className="strong">الشيكات المؤجلة</span>
        {held.length > 0 && <span className="pill pill-due">عندك <span className="num">{held.length}</span> · <span className="num">{fmt(held.reduce((s, c) => s + c.amount, 0))}</span></span>}
      </div>
      {list.length > 0 && (
        <ul className="rows card-list bills-list">
          {list.map((c) => (
            <li key={c.id} className="bill-row cheque-row">
              <span className="cheque-main">
                <span><span className="num">{c.number}</span> <span className="muted small">· {c.bank || "—"}</span></span>
                <span className="muted small">يستحق <span className="num">{c.due}</span></span>
              </span>
              <span className="bill-end">
                <Money fils={c.amount} />
                <span className={`pill ${pillOf[c.state]}`}>{CHEQUE_LABEL[c.state]}</span>
              </span>
              <span className="cheque-acts">
                {c.state !== "deposited" && <button type="button" className="link press cheque-dep" onClick={() => { const u = depositCheque(c.id); if (u) toast({ text: `انودع شيك ${c.number} · انسجلت دفعة`, undo: u, stamp: true }); }}>أودعته</button>}
                {c.state !== "returned" && <button type="button" className="link press danger-text cheque-ret" onClick={() => { const u = returnCheque(c.id); if (u) toast({ text: `شيك ${c.number} رجع${c.state === "deposited" ? " · انمسحت دفعته" : ""}`, undo: u }); }}>رجع</button>}
                {c.state === "held" && <button type="button" className="link press muted" onClick={() => { removeCheque(c.id); toast({ text: "انحذف الشيك", undo: () => setCheque(c) }); }}>احذف</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!open ? <button type="button" className="btn btn-ghost press" id="cheque-open" onClick={() => setOpen(true)}>أضف شيكات</button> : (
        <form className="stack bill-form" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <Chips<N> label="كم شيك" value={n} onChange={setN} options={[{ id: "1", label: "شيك واحد" }, { id: "6", label: "6 أشهر" }, { id: "12", label: "سنة (12)" }]} />
          <div className="grid-2">
            <label className="field"><span>{n === "1" ? "رقم الشيك" : "رقم أول شيك"}</span><input id="chq-number" className="input num" inputMode="numeric" dir="ltr" value={f.number} onChange={(e) => { setF({ ...f, number: e.target.value }); setError(""); }} /></label>
            <label className="field"><span>البنك</span><input id="chq-bank" className="input" value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} placeholder="بنك البحرين الوطني" /></label>
          </div>
          <div className="grid-2 dates">
            <label className="field"><span>المبلغ (د.ب)</span><input id="chq-amount" className="input num" inputMode="decimal" dir="ltr" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
            <label className="field"><span>{n === "1" ? "تاريخ الاستحقاق" : "استحقاق أول شيك"}</span><input id="chq-due" className="input num" type="date" dir="ltr" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></label>
          </div>
          {n !== "1" && <p className="muted small" style={{ margin: 0 }}>الرقم يزيد واحد والتاريخ شهر لكل شيك.</p>}
          <p className="muted small" style={{ margin: 0 }}>الشيك ما يصير دفعة لين تضغط «أودعته». لا تحفظ صورة الشيك (فيها رقم الحساب والتوقيع).</p>
          {error && <div className="field-error" role="alert">{error}</div>}
          <div className="grid-2">
            <button type="submit" className="btn press" id="chq-add">{n === "1" ? "أضف الشيك" : `أضف ${n} شيكات`}</button>
            <button type="button" className="btn btn-ghost press" onClick={() => { setOpen(false); setError(""); }}>إلغاء</button>
          </div>
        </form>
      )}
    </div>
  );
}
