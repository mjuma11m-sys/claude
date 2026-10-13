import { useEffect, useState } from "react";
import type { Method, Unit } from "../data/types";
import { useStore } from "../data/store";
import { fmt, monthKey, monthName, parseBHD, unitStatus } from "../data/logic";
import { Chips, Sheet, useToast } from "../ui/kit";
import { Money, StatusPill } from "../theme/AppShell";
import { Icon } from "../ui/icons";

const METHODS: Method[] = ["BenefitPay", "تحويل", "نقد", "شيك"];

/** تفاصيل الوحدة + تسجيل دفعة الشهر */
export function PaySheet({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  const { data, pay, unpay } = useStore();
  const toast = useToast();
  const [shown, setShown] = useState<Unit | null>(unit);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("BenefitPay");
  const [error, setError] = useState("");

  // نخلي آخر وحدة معروضة وقت حركة الإغلاق
  useEffect(() => {
    if (unit) {
      setShown(unit);
      setAmount(fmt(unit.rent));
      setMethod("BenefitPay");
      setError("");
    }
  }, [unit]);

  const u = shown;
  const status = u ? unitStatus(data, u) : "due";
  const history = u ? data.payments.filter((p) => p.unitId === u.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4) : [];

  const submit = () => {
    if (!u) return;
    const fils = parseBHD(amount);
    if (fils === null) { setError("اكتب المبلغ بالدينار، مثل 180 أو 180.500"); return; }
    const p = pay(u.id, fils, method);
    onClose();
    toast({ text: `انسجلت دفعة ${u.name} · ${fmt(fils)} د.ب`, undo: () => unpay(p.id) });
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

          {u.tenant && status !== "paid" && (
            <form className="pay-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <label htmlFor="pay-amount" className="strong">تسجيل دفعة {monthName(monthKey(new Date()))}</label>
              <div className="money-input">
                <input id="pay-amount" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby="pay-err" />
                <span>د.ب</span>
              </div>
              {error && <div id="pay-err" className="field-error">{error}</div>}
              <Chips label="طريقة الدفع" value={method} onChange={setMethod} options={METHODS.map((m) => ({ id: m, label: m }))} />
              <button type="submit" className="btn btn-block press">سجّل الدفعة</button>
            </form>
          )}

          {history.length > 0 && (
            <div>
              <div className="muted small" style={{ marginBottom: 6 }}>آخر الدفعات</div>
              <ul className="rows">
                {history.map((p) => (
                  <li key={p.id}>
                    <span>{monthName(p.month)} <span className="muted small">· {p.method}</span></span>
                    <Money fils={p.amount} tone="in" />
                  </li>
                ))}
              </ul>
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
  const unpaid = data.units.filter((u) => u.tenant && unitStatus(data, u) !== "paid");
  return (
    <Sheet open={open} onClose={onClose} title="دفعة جديدة · اختر الوحدة">
      {unpaid.length === 0 ? (
        <p className="muted">كل الوحدات مدفوعة هالشهر 🎉</p>
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
