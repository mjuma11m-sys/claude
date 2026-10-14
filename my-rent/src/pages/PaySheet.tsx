import { useEffect, useState } from "react";
import type { Method, Payment, Unit } from "../data/types";
import { useStore } from "../data/store";
import { arrears, fmt, monthName, owedMonths, parseBHD, unitStatus } from "../data/logic";
import { Chips, Sheet, useToast } from "../ui/kit";
import { Money, StatusPill } from "../theme/AppShell";
import { Icon } from "../ui/icons";

const METHODS: Method[] = ["BenefitPay", "تحويل", "نقد", "شيك"];

/** رسالة تذكير صريحة: المبلغ والأشهر، بدون تهديد */
function reminderUrl(unit: Unit, months: string[], amount: number) {
  const text = `السلام عليكم ${unit.tenant?.name ?? ""}، تذكير بإيجار ${unit.name} (${months.map(monthName).join("، ")}): ${fmt(amount)} د.ب. إذا تم الدفع تجاهل الرسالة، وشكراً.`;
  const digits = (unit.tenant?.phone ?? "").replace(/\D/g, "");
  const to = digits.length === 8 ? `973${digits}` : ""; // رقم بحريني كامل، وإلا يختار المستخدم المحادثة
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** تفاصيل الوحدة + المتأخرات + تسجيل دفعة + الإيصالات */
export function PaySheet({ unit, onClose, onReceipt, onEdit }: { unit: Unit | null; onClose: () => void; onReceipt: (p: Payment, u: Unit) => void; onEdit: (u: Unit) => void }) {
  const { data, pay, unpay, vacate, deleteUnit, saveUnit } = useStore();
  const [confirmVacate, setConfirmVacate] = useState(false);
  const toast = useToast();
  const [shown, setShown] = useState<Unit | null>(unit);
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("BenefitPay");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const owed = shown ? owedMonths(data, shown) : [];

  // أول ما تنفتح: أقدم شهر ما اندفع، والمبلغ الباقي منه
  useEffect(() => {
    if (!unit) return;
    setShown(unit);
    const first = owedMonths(data, unit)[0];
    setMonth(first?.month ?? "");
    setAmount(first ? fmt(first.left) : "");
    setMethod("BenefitPay");
    setError("");
    setDone(false);
    setConfirmVacate(false);
  }, [unit]);

  const u = shown;
  const status = u ? unitStatus(data, u) : "due";
  const arr = u ? arrears(data, u) : { months: [], amount: 0 };
  const history = u ? data.payments.filter((p) => p.unitId === u.id).sort((a, b) => b.month.localeCompare(a.month) || b.date.localeCompare(a.date)).slice(0, 6) : [];

  const pickMonth = (m: string) => {
    setMonth(m);
    const o = owed.find((x) => x.month === m);
    if (o) setAmount(fmt(o.left));
  };

  const submit = () => {
    if (!u || !month) return;
    const fils = parseBHD(amount);
    if (fils === null) { setError("اكتب المبلغ بالدينار، مثل 180 أو 180.500"); return; }
    const p = pay(u.id, month, fils, method);
    setDone(true); // الزر يصير ✓ لحظة قبل ما تنسكّر النافذة
    window.setTimeout(onClose, 260);
    toast({ text: `انسجلت دفعة ${u.name} · ${monthName(month)} · ${fmt(fils)} د.ب`, undo: () => unpay(p.id), stamp: true });
  };

  return (
    <Sheet open={!!unit} onClose={onClose} title={u ? `${u.name} · ${u.building}` : ""}>
      {u && (
        <div className="stack">
          <div className="kv-row">
            <div>
              <div className="muted small">المستأجر</div>
              <div className="strong">{u.tenant?.name ?? "شاغرة"}</div>
              {u.tenant && <div className="muted small num" style={{ display: "flex", gap: 4, alignItems: "center" }}>{Icon.phone}{u.tenant.phone}</div>}
            </div>
            <StatusPill status={status} />
          </div>
          <div className="kv-grid">
            <div><div className="muted small">الإيجار الشهري</div><Money fils={u.rent} /></div>
            <div><div className="muted small">يستحق يوم</div><span className="num strong">{u.dueDay}</span></div>
            {u.tenant && <div><div className="muted small">من</div><span className="num strong">{u.tenant.since}</span></div>}
          </div>

          {arr.amount > 0 && (
            <div className="arrears">
              <div>
                <div className="strong">متأخرات {arr.months.length === 1 ? "شهر" : arr.months.length === 2 ? "شهرين" : <><span className="num">{arr.months.length}</span> أشهر</>}</div>
                <div className="small">{arr.months.map((m) => monthName(m.month)).join("، ")}</div>
              </div>
              <Money fils={arr.amount} tone="out" />
              <a className="btn btn-wa press" href={reminderUrl(u, arr.months.map((m) => m.month), arr.amount)} target="_blank" rel="noreferrer">ذكّره بالواتساب</a>
            </div>
          )}

          {u.tenant && owed.length > 0 && (
            <form className="pay-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <span className="strong">تسجيل دفعة</span>
              <Chips label="عن شهر" value={month} onChange={pickMonth} options={owed.map((o) => ({ id: o.month, label: monthName(o.month) }))} />
              <label htmlFor="pay-amount" className="sr-only">المبلغ</label>
              <div className="money-input">
                <input id="pay-amount" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby="pay-err" />
                <span>د.ب</span>
              </div>
              {error && <div id="pay-err" className="field-error">{error}</div>}
              <Chips label="طريقة الدفع" value={method} onChange={setMethod} options={METHODS.map((m) => ({ id: m, label: m }))} />
              <button type="submit" className={`btn btn-block press${done ? " btn-done" : ""}`} disabled={done}>{done ? <>{Icon.check} انسجلت</> : "سجّل الدفعة"}</button>
            </form>
          )}

          {history.length > 0 && (
            <div>
              <div className="muted small" style={{ marginBottom: 6 }}>الدفعات والإيصالات</div>
              <ul className="rows rows-tap card-list">
                {history.map((p) => (
                  <li key={p.id}>
                    <button className="row-btn press" onClick={() => onReceipt(p, u)} aria-label={`إيصال ${monthName(p.month)}`}>
                      <span>{monthName(p.month)} <span className="muted small">· {p.method}</span></span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Money fils={p.amount} tone="in" /><span className="receipt-tag">إيصال</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="unit-actions">
            <button type="button" className="btn btn-ghost press" onClick={() => onEdit(u)}>{u.tenant ? "تعديل" : "أضف مستأجر"}</button>
            {u.tenant && !confirmVacate && <button type="button" className="btn btn-ghost press danger-text" onClick={() => setConfirmVacate(true)}>إخلاء الوحدة</button>}
            {!u.tenant && !data.payments.some((p) => p.unitId === u.id) && (
              <button type="button" className="btn btn-ghost press danger-text" onClick={() => { if (deleteUnit(u.id)) { onClose(); toast({ text: `انحذفت ${u.name}`, undo: () => saveUnit(u) }); } }}>حذف الوحدة</button>
            )}
          </div>
          {confirmVacate && u.tenant && (
            <div className="confirm-box" role="alert">
              <div className="strong">إخلاء {u.name} من {u.tenant.name}؟</div>
              {arr.amount > 0 && <div className="small">عليه متأخرات <Money fils={arr.amount} /> — بعد الإخلاء ما تبين بالمتأخرات. سجّلها أو اطبع كشف قبل.</div>}
              <div className="small muted">الدفعات السابقة تبقى بالسجل والتقارير.</div>
              <div className="grid-2">
                <button type="button" className="btn btn-danger press" onClick={() => { const before = u; vacate(u.id); onClose(); toast({ text: `${u.name} صارت شاغرة`, undo: () => saveUnit(before) }); }}>أكيد، أخلِها</button>
                <button type="button" className="btn btn-ghost press" onClick={() => setConfirmVacate(false)}>إلغاء</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** زر الإضافة: اختار الوحدة اللي بتسجّل دفعتها */
export function PickUnitSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (u: Unit) => void }) {
  const { data } = useStore();
  const unpaid = data.units.filter((u) => u.tenant && owedMonths(data, u).length > 0);
  return (
    <Sheet open={open} onClose={onClose} title="دفعة جديدة · اختر الوحدة">
      {unpaid.length === 0 ? (
        <p className="muted">كل الوحدات مدفوعة.</p>
      ) : (
        <ul className="rows rows-tap">
          {unpaid.map((u) => (
            <li key={u.id}>
              <button className="row-btn press" onClick={() => onPick(u)}>
                <span><span className="strong">{u.name}</span> <span className="muted small">· {u.tenant?.name}</span></span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}><StatusPill status={unitStatus(data, u)} />{Icon.chevron}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
