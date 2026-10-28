import { t } from "../i18n";
import { useEffect, useState } from "react";
import type { Unit } from "../data/types";
import { useStore } from "../data/store";
import { addMonthsDay, fmt, isoDay, monthKey, monthLabel, nextMonth, parseBHD, renewUnit } from "../data/logic";
import { Money } from "../theme/AppShell";
import { Chips, Sheet, useToast } from "../ui/kit";

type Term = "12" | "6" | "custom";

/** رسالة التجديد للمستأجر: النهاية الجديدة والإيجار ومن متى */
function renewUrl(u: Unit, until: string, rent: number, from: string | null) {
  const text = t("السلام عليكم {v1}، تم تجديد عقد {v2} لين {v3}. الإيجار الشهري {v4} د.ب{v5}. شكراً.", { v1: u.tenant?.name ?? "", v2: u.name, v3: until, v4: fmt(rent), v5: from ? ` ابتداءً من ${monthLabel(from)}` : "" });
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return setError(t("اختار تاريخ نهاية العقد"));
    if (until <= base) return setError(t("النهاية الجديدة لازم بعد النهاية الحالية"));
    if (newRent === null) return setError(t("اكتب الإيجار بالدينار، مثل 200 أو 185.500"));
    const before = u;
    saveUnit(renewUnit(u, until, newRent, from));
    setDone({ until, rent: newRent, old: before.rent, from: changed ? from : null });
    toast({ text: t("تجدد عقد {v1} لين {v2}", { v1: u.name, v2: until }), undo: () => { saveUnit(before); onClose(); }, stamp: true });
  };

  return (
    <Sheet open={!!unit} onClose={onClose} title={t("تجديد عقد {v1}", { v1: u.name })}>
      {done ? (
        <div className="stack renew-done">
          <div className="strong">{t("تجدد العقد لين")} <span className="num">{done.until}</span></div>
          <div className="small">{t("الإيجار")} <Money fils={done.rent} />{done.from ? <> {t("ابتداءً من")} {monthLabel(done.from)} {t("· الأشهر قبله تبقى على")} <Money fils={done.old} /></> : null}</div>
          <a className="btn btn-wa press" id="renew-wa" href={renewUrl(u, done.until, done.rent, done.from)} target="_blank" rel="noreferrer">{t("بلّغه بالواتساب")}</a>
          <button type="button" className="btn btn-ghost press" onClick={onClose}>{t("تم")}</button>
        </div>
      ) : (
        <form className="pay-form renew-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="small muted">{u.tenant.name} {t("· العقد الحالي")} {u.tenant.until ? <>{t("لين")} <span className="num">{u.tenant.until}</span></> : t("بدون نهاية")}</div>
          <Chips<Term> label={t("المدة")} value={term} onChange={(t) => { setTerm(t); setError(""); }} options={[{ id: "12", label: t("سنة") }, { id: "6", label: t("6 أشهر") }, { id: "custom", label: t("تاريخ ثاني") }]} />
          {term === "custom" ? (
            <label className="field"><span>{t("نهاية العقد الجديدة")}</span><input id="renew-until" className="input num" type="date" dir="ltr" value={custom} onChange={(e) => { setCustom(e.target.value); setError(""); }} /></label>
          ) : <div className="small">{t("النهاية الجديدة:")} <b className="num">{until}</b></div>}
          <label className="field"><span>{t("الإيجار الشهري (د.ب)")}</span><input id="renew-rent" className="input num" inputMode="decimal" dir="ltr" value={rent} onChange={(e) => { setRent(e.target.value); setError(""); }} /></label>
          {changed && <div className="small renew-change" id="renew-change">{t("من")} {monthLabel(from)}: <span className="num">{fmt(u.rent)}</span> ← <b className="num">{fmt(newRent!)}</b> {t("د.ب · الأشهر قبله ما تتغيّر")}</div>}
          {error && <div className="field-error" role="alert">{error}</div>}
          <button type="submit" id="renew-btn" className="btn btn-block press">{t("جدّد العقد")}</button>
        </form>
      )}
    </Sheet>
  );
}
