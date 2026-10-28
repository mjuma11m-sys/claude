import { t } from "../i18n";
import { useState } from "react";
import type { BillKind, Unit } from "../data/types";
import { useStore } from "../data/store";
import { BILL_KINDS, billKindLabel, billsDue, fmt, monthKey, monthLabel, monthName, parseBHD, prevMonth, unitBills } from "../data/logic";
import { Money } from "../theme/AppShell";
import { Chips, useToast } from "../ui/kit";

/** تذكير بفاتورة الهيئة — المستأجر يدفعها بنفسه */
function billUrl(u: Unit, months: string[], amount: number) {
  const text = t("السلام عليكم {v1}، تذكير بفاتورة الكهرباء والماء لـ {v2} ({v3}): {v4} د.ب. نرجو سدادها لهيئة الكهرباء والماء. إذا تم السداد تجاهل الرسالة، وشكراً.", { v1: u.tenant?.name ?? "", v2: u.name, v3: months.map(monthName).join("، "), v4: fmt(amount) });
  const digits = (u.tenant?.phone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits.length === 8 ? `973${digits}` : ""}?text=${encodeURIComponent(text)}`;
}

/** DW-026: فواتير الكهرباء والماء بشاشة الوحدة — تسجيل + مسددة/لا + تذكير */
export function BillsBox({ unit }: { unit: Unit }) {
  const { data, saveBill, removeBill } = useStore();
  const toast = useToast();
  const cur = monthKey(new Date());
  const [month, setMonth] = useState(prevMonth(cur));
  const [kind, setKind] = useState<BillKind>("ewa");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const bills = unitBills(data, unit.id).slice(0, 6);
  const due = billsDue(data, unit);
  const months = [prevMonth(prevMonth(cur)), prevMonth(cur), cur];

  const add = () => {
    const fils = parseBHD(amount);
    if (fils === null) return setError(t("اكتب مبلغ الفاتورة بالدينار، مثل 24.350"));
    const b = saveBill({ unitId: unit.id, month, kind, amount: fils, paid: false });
    setAmount(""); setError("");
    toast({ text: t("انسجلت فاتورة {v1} · {v2} د.ب", { v1: monthName(month), v2: fmt(fils) }), undo: () => removeBill(b.id) });
  };

  return (
    <div className="bills-box stack" id="bills-box">
      <div className="kv-row">
        <span className="strong">{t("فواتير الكهرباء والماء")} <span className="muted small">{t("· يدفعها المستأجر للهيئة")}</span></span>
        {due.amount > 0 && <span className="pill pill-late" id="bills-due">{t("غير مسددة")} <span className="num">{fmt(due.amount)}</span></span>}
      </div>
      {bills.length > 0 && (
        <ul className="rows card-list bills-list">
          {bills.map((b) => (
            <li key={b.id} className="bill-row">
              <span>{monthLabel(b.month)} <span className="muted small">· {billKindLabel(b.kind)}</span></span>
              <span className="bill-end">
                <Money fils={b.amount} />
                <button type="button" className={`pill press bill-st ${b.paid ? "pill-paid" : "pill-late"}`} aria-pressed={b.paid}
                  onClick={() => { saveBill({ ...b, paid: !b.paid }); toast({ text: b.paid ? t("رجعت غير مسددة") : t("فاتورة {v1} مسددة", { v1: monthName(b.month) }), undo: () => saveBill(b) }); }}>
                  {b.paid ? t("مسددة") : t("غير مسددة")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {due.amount > 0 && unit.tenant && <a className="btn btn-wa press" id="bills-wa" href={billUrl(unit, due.list.map((b) => b.month), due.amount)} target="_blank" rel="noreferrer">{t("ذكّره بالفاتورة")}</a>}
      <form className="stack bill-form" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Chips label={t("الشهر")} value={month} onChange={setMonth} options={months.map((m) => ({ id: m, label: monthName(m) }))} />
        <Chips<BillKind> label={t("النوع")} value={kind} onChange={setKind} options={BILL_KINDS} />
        <div className="bill-add">
          <div className="money-input"><input id="bill-amount" inputMode="decimal" dir="ltr" value={amount} placeholder="0.000" aria-label={t("مبلغ الفاتورة")} onChange={(e) => { setAmount(e.target.value); setError(""); }} /><span>{t("د.ب")}</span></div>
          <button type="submit" className="btn btn-ghost press" id="bill-add">{t("أضف الفاتورة")}</button>
        </div>
        {error && <div className="field-error" role="alert">{error}</div>}
      </form>
    </div>
  );
}
