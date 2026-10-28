import { isEn, t } from "../i18n";
import { useEffect, useState } from "react";
import type { Method, Payment, Unit } from "../data/types";
import { useStore } from "../data/store";
import { reminderUrl, arrears, billsDue, chequeHeld, contractAlerts, fmt, monthKey, rentAt, upcomingRent, monthLabel, monthName, nextUnpaid, owedMonths, paidThrough, pastContracts, parseBHD, prepaid, unitStatus } from "../data/logic";
import { Chips, Sheet, useToast } from "../ui/kit";
import { Money, StatusPill } from "../theme/AppShell";
import { Icon } from "../ui/icons";
import { BillsBox } from "./Bills";
import { ChequesBox } from "./Cheques";

const METHODS: Method[] = ["BenefitPay", "تحويل", "نقد", "شيك"];

/** تفاصيل الوحدة + المتأخرات + تسجيل دفعة + الإيصالات */
export function PaySheet({ unit, onClose, onReceipt, onEdit, onStatement, onContract, onRenew }: { unit: Unit | null; onClose: () => void; onReceipt: (p: Payment, u: Unit) => void; onEdit: (u: Unit) => void; onStatement: (u: Unit) => void; onContract: (u: Unit) => void; onRenew: (u: Unit) => void }) {
  const { data, pay, unpay, payAhead, vacate, undeposit, deleteUnit, saveUnit } = useStore();
  const [confirmVacate, setConfirmVacate] = useState(false);
  const toast = useToast();
  const [shown, setShown] = useState<Unit | null>(unit);
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("BenefitPay");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ahead, setAhead] = useState<"0" | "1" | "3" | "6" | "12">("0");
  const [tab, setTab] = useState<"pay" | "bills" | "log">("pay"); // DW-031: تبويبات بدل شاشة طويلة

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
    setAhead("0");
    setTab("pay");
  }, [unit]);

  const u = shown;
  const status = u ? unitStatus(data, u) : "due";
  const arr = u ? arrears(data, u) : { months: [], amount: 0 };
  const history = u ? data.payments.filter((p) => p.unitId === u.id).sort((a, b) => b.month.localeCompare(a.month) || b.date.localeCompare(a.date)).slice(0, 6) : [];

  // الإخلاء + سجل التأمين (رجع أو انخصم). التراجع يرجّع المستأجر ويمسح سجل التأمين
  const doVacate = (returned?: boolean) => {
    if (!u) return;
    const before = u;
    const { log, undoContract } = vacate(u.id, returned);
    onClose();
    const dep = log ? t(" · التأمين {v1} د.ب {v2}", { v1: fmt(log.amount), v2: log.returned ? "رجع" : "انخصم" }) : "";
    toast({ text: t("{v1} صارت شاغرة{v2}", { v1: u.name, v2: dep }), undo: () => { saveUnit(before); undoContract(); if (log) undeposit(log.id); } });
  };

  const pickMonth = (m: string) => {
    setMonth(m);
    const o = owed.find((x) => x.month === m);
    if (o) setAmount(fmt(o.left));
  };

  const submit = () => {
    if (!u || !month) return;
    const fils = parseBHD(amount);
    if (fils === null) { setError(t("اكتب المبلغ بالدينار، مثل 180 أو 180.500")); return; }
    const p = pay(u.id, month, fils, method);
    setDone(true); // الزر يصير ✓ لحظة قبل ما تنسكّر النافذة
    window.setTimeout(onClose, 260);
    toast({ text: t("انسجلت دفعة {v1} · {v2} · {v3} د.ب", { v1: u.name, v2: monthName(month), v3: fmt(fils) }), undo: () => unpay(p.id), stamp: true });
  };

  // DW-022: دفعة مقدمة — كل شهر بمبلغ الإيجار كامل، والتراجع يمسح الكل
  const submitAhead = () => {
    if (!u || ahead === "0") return;
    const r = payAhead(u.id, Number(ahead), method);
    if (!r) return;
    onClose();
    toast({ text: t("انسجلت دفعة مقدمة {v1} · {v2} {v3} لين {v4}", { v1: u.name, v2: r.months.length, v3: r.months.length > 10 || r.months.length < 3 ? "شهر" : "أشهر", v4: monthLabel(r.months[r.months.length - 1]) }), undo: r.undo, stamp: true });
  };
  const thru = u ? paidThrough(data, u) : null;
  const renewSoon = !!u?.tenant?.until && contractAlerts(data).some((c) => c.unit.id === u.id);
  const up = u ? upcomingRent(u) : null;
  const pre = u ? prepaid(data, u) : { months: [], amount: 0 };

  return (
    <Sheet open={!!unit} onClose={onClose} title={u ? `${u.name} · ${u.building}` : ""}>
      {u && (
        <div className="stack">
          <div className="kv-row">
            <div>
              <div className="muted small">{t("المستأجر")}</div>
              <div className="strong">{u.tenant?.name ?? t("شاغرة")}</div>
              {u.tenant && <div className="muted small num" style={{ display: "flex", gap: 4, alignItems: "center" }}>{Icon.phone}{u.tenant.phone}</div>}
            </div>
            <StatusPill status={status} />
          </div>
          <div className="kv-grid">
            <div><div className="muted small">{t("الإيجار الشهري")}</div><Money fils={rentAt(u, monthKey(new Date()))} />{up && <div className="small muted" id="rent-up">{t("يصير")} <span className="num">{fmt(up.rent)}</span> {isEn() ? "from" : "من"} {monthLabel(up.from)}</div>}</div>
            <div><div className="muted small">{t("يستحق يوم")}</div><span className="num strong">{u.dueDay}</span></div>
            {u.tenant && <div><div className="muted small">{isEn() ? "from" : "من"}</div><span className="num strong">{u.tenant.since}</span></div>}
            {!!u.tenant?.deposit && <div><div className="muted small">{t("التأمين")}</div><Money fils={u.tenant.deposit} /></div>}
          </div>

          {u.notes && <p className="unit-notes small" id="unit-notes">📝 {u.notes}</p>}

          {arr.amount > 0 && (
            <div className="arrears">
              <div>
                <div className="strong">{t("متأخرات")} {arr.months.length === 1 ? t("شهر") : arr.months.length === 2 ? t("شهرين") : <><span className="num">{arr.months.length}</span> {t("أشهر")}</>}</div>
                <div className="small">{arr.months.map((m) => monthName(m.month)).join(t("، "))}</div>
              </div>
              <Money fils={arr.amount} tone="out" />
              <a className="btn btn-wa press" href={reminderUrl(u, arr.months.map((m) => m.month), arr.amount)} target="_blank" rel="noreferrer">{t("ذكّره بالواتساب")}</a>
            </div>
          )}

{u.tenant && (() => {
            const nBills = billsDue(data, u).list.length + chequeHeld(data, u.id).length;
            return <div className="unit-tabs"><Chips<"pay" | "bills" | "log"> label={t("أقسام الوحدة")} value={tab} onChange={setTab} options={[
              { id: "pay", label: t("الدفع") }, { id: "bills", label: t("الفواتير والشيكات"), ...(nBills ? { count: nBills } : {}) }, { id: "log", label: t("السجل"), ...(history.length ? { count: history.length } : {}) }]} /></div>;
          })()}

          {(tab === "pay" || !u.tenant) && <>
          {u.tenant && owed.length > 0 && (
            <form className="pay-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <span className="strong">{t("تسجيل دفعة")}</span>
              <Chips label={t("عن شهر")} value={month} onChange={pickMonth} options={owed.map((o) => ({ id: o.month, label: monthName(o.month) }))} />
              <label htmlFor="pay-amount" className="sr-only">{t("المبلغ")}</label>
              <div className="money-input">
                <input id="pay-amount" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby="pay-err" />
                <span>{t("د.ب")}</span>
              </div>
              {error && <div id="pay-err" className="field-error">{error}</div>}
              <Chips label={t("طريقة الدفع")} value={method} onChange={setMethod} options={METHODS.map((m) => ({ id: m, label: t(m) }))} />
              <button type="submit" className={`btn btn-block press${done ? " btn-done" : ""}`} disabled={done}>{done ? <>{Icon.check} {t("انسجلت")}</> : t("سجّل الدفعة")}</button>
            </form>
          )}

          {u.tenant && (
            <form className="pay-form ahead-form" onSubmit={(e) => { e.preventDefault(); submitAhead(); }}>
              <span className="strong">{t("دفعة مقدمة")}</span>
              <span className="muted small">{thru ? <>{t("مدفوع لين")} <b>{monthLabel(thru)}</b>{pre.months.length > 0 && <> {t("· مقدم")} <span className="num">{pre.months.length}</span> {pre.months.length > 10 || pre.months.length < 3 ? t("شهر") : t("أشهر")}</>}</> : t("فيه أشهر ما اندفعت — المقدم يسددها أول")}</span>
              <Chips label={t("كم شهر")} value={ahead} onChange={setAhead} options={[{ id: "1", label: t("شهر") }, { id: "3", label: t("3 أشهر") }, { id: "6", label: t("6 أشهر") }, { id: "12", label: t("سنة") }]} />
              {ahead !== "0" && (() => { const ms = nextUnpaid(data, u, Number(ahead)); const past = !!u.tenant?.until && ms[ms.length - 1] > u.tenant.until.slice(0, 7); return <><div className="small ahead-sum">{isEn() ? "from" : "من"} {monthLabel(ms[0])} {t("لين")} {monthLabel(ms[ms.length - 1])} · <Money fils={ms.reduce((s, m) => s + rentAt(u, m), 0)} /></div>{past && <div className="small field-warn" id="ahead-warn">{t("⚠️ فيها أشهر بعد نهاية العقد (")}{u.tenant!.until}{t("). جدّد العقد لو اتفقتوا.")}</div>}</>; })()}
              {owed.length === 0 && <Chips label={t("طريقة الدفع")} value={method} onChange={setMethod} options={METHODS.map((m) => ({ id: m, label: t(m) }))} />}
              <button type="submit" id="ahead-btn" className="btn btn-ghost btn-block press" disabled={ahead === "0"}>{t("احفظ الدفعة المقدمة")}</button>
            </form>
          )}
          </>}

          {u.tenant && tab === "bills" && <>
          {u.tenant && <BillsBox unit={u} />}
          {u.tenant && <ChequesBox unit={u} />}
          </>}

          {(tab === "log" || !u.tenant) && <>
          {history.length > 0 && (
            <div>
              <div className="muted small" style={{ marginBottom: 6 }}>{t("الدفعات والإيصالات")}</div>
              <ul className="rows rows-tap card-list">
                {history.map((p) => (
                  <li key={p.id}>
                    <button className="row-btn press" onClick={() => onReceipt(p, u)} aria-label={t("إيصال {v1}", { v1: monthName(p.month) })}>
                      <span>{monthName(p.month)} <span className="muted small">· {t(p.method)}</span></span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Money fils={p.amount} tone="in" /><span className="receipt-tag">{t("إيصال")}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          </>}

          <div className="unit-actions">
            {u.tenant && <button type="button" className="btn btn-ghost press" onClick={() => onStatement(u)}>{t("كشف حساب")}</button>}
            {(u.tenant || pastContracts(data, u.id).length > 0) && <button type="button" className="btn btn-ghost press" onClick={() => onContract(u)}>{u.tenant ? t("العقد") : t("العقود السابقة")}{u.contractFile ? " ✓" : ""}</button>}
            {u.tenant?.until && <button type="button" className={`btn press ${renewSoon ? "" : "btn-ghost"}`} onClick={() => onRenew(u)}>{t("جدّد العقد")}</button>}
            <button type="button" className="btn btn-ghost press" onClick={() => onEdit(u)}>{u.tenant ? t("تعديل") : t("أضف مستأجر")}</button>
            {u.tenant && !confirmVacate && <button type="button" className="btn btn-ghost press danger-text" onClick={() => setConfirmVacate(true)}>{t("إخلاء الوحدة")}</button>}
            {!u.tenant && !data.payments.some((p) => p.unitId === u.id) && (
              <button type="button" className="btn btn-ghost press danger-text" onClick={() => { if (deleteUnit(u.id)) { onClose(); toast({ text: t("انحذفت {v1}", { v1: u.name }), undo: () => saveUnit(u) }); } }}>{t("حذف الوحدة")}</button>
            )}
          </div>
          {confirmVacate && u.tenant && (
            <div className="confirm-box" role="alert">
              <div className="strong">{t("إخلاء")} {u.name} {isEn() ? "from" : "من"} {u.tenant.name}{t("؟")}</div>
              {billsDue(data, u).amount > 0 && <div className="small" id="vacate-bills">{t("عليه فواتير كهرباء وماء غير مسددة")} <Money fils={billsDue(data, u).amount} /> {t("— اخصمها من التأمين لو اتفقتوا.")}</div>}
              {arr.amount > 0 && <div className="small">{t("عليه متأخرات")} <Money fils={arr.amount} /> {t("— بعد الإخلاء ما تبين بالمتأخرات. سجّلها أو اطبع كشف قبل.")}</div>}
              <div className="small muted">{t("الدفعات السابقة تبقى بالسجل والتقارير.")}</div>
              {u.tenant.deposit ? (
                <>
                  <div className="small">{t("التأمين")} <Money fils={u.tenant.deposit} />{t(": رجّعته له؟")}</div>
                  <div className="grid-2">
                    <button type="button" className="btn btn-danger press" onClick={() => doVacate(true)}>{t("رجّعته، أخلِها")}</button>
                    <button type="button" className="btn btn-danger press" onClick={() => doVacate(false)}>{t("انخصم، أخلِها")}</button>
                  </div>
                  <button type="button" className="btn btn-ghost press" onClick={() => setConfirmVacate(false)}>{t("إلغاء")}</button>
                </>
              ) : (
                <div className="grid-2">
                  <button type="button" className="btn btn-danger press" onClick={() => doVacate()}>{t("أكيد، أخلِها")}</button>
                  <button type="button" className="btn btn-ghost press" onClick={() => setConfirmVacate(false)}>{t("إلغاء")}</button>
                </div>
              )}
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
    <Sheet open={open} onClose={onClose} title={t("دفعة جديدة · اختر الوحدة")}>
      {unpaid.length === 0 ? (
        <p className="muted">{t("كل الوحدات مدفوعة.")}</p>
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
