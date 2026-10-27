import { useEffect, useState } from "react";
import type { Unit } from "../data/types";
import { useStore } from "../data/store";
import { fmt, isoDay, monthKey, monthLabel, monthAr, rentAt, statement, upcomingRent } from "../data/logic";
import { Sheet, useToast } from "../ui/kit";
import logoUrl from "../../brand/logo-horizontal.svg";
import { canPrint, shareText } from "../native";

const STATE = { paid: "مدفوع", due: "مستحق", late: "متأخر" } as const;

/** كشف حساب المستأجر (DW-017): كل شهر من بداية الحساب — المطلوب والمدفوع والباقي. مشاركة أو طباعة. */
export function StatementSheet({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  const { data } = useStore();
  const toast = useToast();
  const [shown, setShown] = useState<Unit | null>(unit);
  useEffect(() => { if (unit) setShown(unit); }, [unit]);
  const u = shown;
  const st = u ? statement(data, u) : null;

  const text = () => {
    if (!u || !st) return "";
    return [
      `كشف حساب إيجار · ${u.name} · ${u.building}`,
      `المستأجر: ${u.tenant?.name ?? "—"}`,
      ...st.rows.map((r) => `${monthAr(r.month)} ${r.month.slice(0, 4)}: ${STATE[r.state]}${r.paid ? ` · دفع ${fmt(r.paid)}` : ""}${r.left ? ` · باقي ${fmt(r.left)}` : ""}`),
      `مجموع المدفوع: ${fmt(st.paid)} د.ب`,
      st.late ? `متأخرات: ${fmt(st.late)} د.ب` : "ما عليه متأخرات",
      ...(u.tenant?.deposit ? [`التأمين المحفوظ: ${fmt(u.tenant.deposit)} د.ب`] : []),
      `بتاريخ ${isoDay(new Date())} — إداراتي`,
    ].join("\n");
  };

  const share = async () => {
    try {
      if ((await shareText("كشف حساب إيجار", text())) === "copied") toast({ text: "انسخ الكشف، الصقه بالواتساب" });
    } catch { /* المستخدم سكّر المشاركة */ }
  };

  return (
    <Sheet open={!!unit} onClose={onClose} title="كشف حساب">
      {u && st && (
        <div className="stack">
          <div className="receipt statement" id="statement">
            <div className="receipt-top">
              <img src={logoUrl} alt="إداراتي" height={30} />
              <div style={{ textAlign: "end" }}>
                <div className="strong">كشف حساب إيجار</div>
                <div className="num muted small">{isoDay(new Date())}</div>
              </div>
            </div>
            <dl>
              <dt>المستأجر</dt><dd>{u.tenant?.name ?? "—"}</dd>
              <dt>العقار</dt><dd>{u.name} · {u.building}</dd>
              <dt>الإيجار</dt><dd><span className="num">{fmt(rentAt(u, monthKey(new Date())))}</span> د.ب{(() => { const up = upcomingRent(u); return up ? <span className="muted small"> · يصير <span className="num">{fmt(up.rent)}</span> من {monthLabel(up.from)}</span> : null; })()}</dd>
              {!!u.tenant?.deposit && <><dt>التأمين</dt><dd><span className="num">{fmt(u.tenant.deposit)}</span> د.ب</dd></>}
            </dl>
            <table className="st-table">
              <thead><tr><th>الشهر</th><th>المدفوع</th><th>الباقي</th><th>الحالة</th></tr></thead>
              <tbody>
                {[...st.rows].reverse().map((r) => (
                  <tr key={r.month} className={`st-${r.state}`}>
                    <td>{monthAr(r.month)} <span className="num muted">{r.month.slice(0, 4)}</span></td>
                    <td className="num">{r.paid ? fmt(r.paid) : "—"}</td>
                    <td className="num">{r.left ? fmt(r.left) : "—"}</td>
                    <td><span className={`pill pill-${r.state}`}>{STATE[r.state]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="st-totals">
              <div><span>مجموع المدفوع</span><b><span className="num">{fmt(st.paid)}</span> <small>د.ب</small></b></div>
              <div className={st.late ? "is-late" : ""}><span>متأخرات</span><b><span className="num">{fmt(st.late)}</span> <small>د.ب</small></b></div>
              {st.due > 0 && <div><span>مستحق هالشهر</span><b><span className="num">{fmt(st.due)}</span> <small>د.ب</small></b></div>}
            </div>
            <p className="muted small" style={{ margin: "10px 0 0" }}>كشف للاطلاع، مو فاتورة ضريبية.</p>
          </div>
          <div className="grid-2">
            <button className="btn press" onClick={share}>مشاركة</button>
            {canPrint() && <button className="btn btn-ghost press" onClick={() => window.print()}>طباعة</button>}
          </div>
        </div>
      )}
    </Sheet>
  );
}
