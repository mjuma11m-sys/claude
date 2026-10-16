import { useEffect, useState } from "react";
import type { Unit } from "../data/types";
import { useStore } from "../data/store";
import { addMonthsDay, fmt, isoDay, monthKey, monthLabel, nextMonth, parseBHD, renewUnit } from "../data/logic";
import { Money } from "../theme/AppShell";
import { Chips, Sheet, useToast } from "../ui/kit";

type Term = "12" | "6" | "custom";

/** رسالة التجديد للمستأجر: النهاية الجديدة والإيجار ومن متى */
function renewUrl(u: Unit, until: string, rent: number, from: string | null) {
  const text = `السلام عليكم ${u.tenant?.name ?? ""}، تم تجديد عقد ${u.name} لين ${until}. الإيجار الشهري ${fmt(rent)} د.ب${from ? ` ابتداءً من ${monthLabel(from)}` : ""}. شكراً.`;
  const digits = (u.tenant?.phone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits.length === 8 ? `973${digits}` : ""}?text=${encodeURIComponent(text)}`;
}

/** تجديد العقد (DW-024): نهاية جديدة + إيجار جديد من شهر محدد — الأشهر السابقة تبقى على إيجارها */
export function RenewSheet({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  const { data, saveUnit } = useStore();
  const toast = useToast();
  const [shown, setShown] = useState<Unit | null>(unit);
  const [term, setTerm] = useState<Term>("12");
  const [custom, setCustom] = useState("");
  const [rent, setRent] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ until: string; rent: number; old: number; from: string | null } | null>(null);

  useEffect(() => {
    if (!unit) return;
    setShown(unit); setTerm("12"); setCustom(""); setRent(fmt(unit.rent)); setError(""); setDone(null);
  }, [unit]);

  const u = shown ? data.units.find((x) => x.id === shown.id) ?? shown : null;
  if (!u?.tenant) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const base = u.tenant.until ?? isoDay(new Date());
  const until = term === "custom" ? custom : addMonthsDay(base, Number(term));
  const from = nextMonth(u.tenant.until ? base.slice(0, 7) : monthKey(new Date()));
  const newRent = parseBHD(rent);
  const changed = newRent !== null && newRent !== u.rent;

  const submit = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return setError("اختار تاريخ نهاية العقد");
    if (until <= base) return setError("النهاية الجديدة لازم بعد النهاية الحالية");
    if (newRent === null) return setError("اكتب الإيجار بالدينار، مثل 200 أو 185.500");
    const before = u;
    saveUnit(renewUnit(u, until, newRent, from));
    setDone({ until, rent: newRent, old: before.rent, from: changed ? from : null });
    toast({ text: `تجدد عقد ${u.name} لين ${until}`, undo: () => { saveUnit(before); onClose(); }, stamp: true });
  };

  return (
    <Sheet open={!!unit} onClose={onClose} title={`تجديد عقد ${u.name}`}>
      {done ? (
        <div className="stack renew-done">
          <div className="strong">تجدد العقد لين <span className="num">{done.until}</span></div>
          <div className="small">الإيجار <Money fils={done.rent} />{done.from ? <> ابتداءً من {monthLabel(done.from)} · الأشهر قبله تبقى على <Money fils={done.old} /></> : null}</div>
          <a className="btn btn-wa press" id="renew-wa" href={renewUrl(u, done.until, done.rent, done.from)} target="_blank" rel="noreferrer">بلّغه بالواتساب</a>
          <button type="button" className="btn btn-ghost press" onClick={onClose}>تم</button>
        </div>
      ) : (
        <form className="pay-form renew-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="small muted">{u.tenant.name} · العقد الحالي {u.tenant.until ? <>لين <span className="num">{u.tenant.until}</span></> : "بدون نهاية"}</div>
          <Chips<Term> label="المدة" value={term} onChange={(t) => { setTerm(t); setError(""); }} options={[{ id: "12", label: "سنة" }, { id: "6", label: "6 أشهر" }, { id: "custom", label: "تاريخ ثاني" }]} />
          {term === "custom" ? (
            <label className="field"><span>نهاية العقد الجديدة</span><input id="renew-until" className="input num" type="date" dir="ltr" value={custom} onChange={(e) => { setCustom(e.target.value); setError(""); }} /></label>
          ) : <div className="small">النهاية الجديدة: <b className="num">{until}</b></div>}
          <label className="field"><span>الإيجار الشهري (د.ب)</span><input id="renew-rent" className="input num" inputMode="decimal" dir="ltr" value={rent} onChange={(e) => { setRent(e.target.value); setError(""); }} /></label>
          {changed && <div className="small renew-change" id="renew-change">من {monthLabel(from)}: <span className="num">{fmt(u.rent)}</span> ← <b className="num">{fmt(newRent!)}</b> د.ب · الأشهر قبله ما تتغيّر</div>}
          {error && <div className="field-error" role="alert">{error}</div>}
          <button type="submit" id="renew-btn" className="btn btn-block press">جدّد العقد</button>
        </form>
      )}
    </Sheet>
  );
}
