import { useEffect, useState } from "react";
import type { Payment, Unit } from "../data/types";
import { creditLabel, fmt, invoiceLabel, isCommercial, monthName, parseBHD, vatSplit } from "../data/logic";
import { useStore } from "../data/store";
import { creditable } from "../data/reducer";
import { canPrint, shareText } from "../native";
import { Sheet, useToast } from "../ui/kit";
import logoUrl from "../../brand/logo-horizontal.svg";
import sealUrl from "../../brand/symbol.svg";

export type ReceiptRef = { payment: Payment; unit: Unit } | null;

const receiptNo = (p: Payment) => `R-${p.month.replace("-", "")}-${p.id.slice(0, 4).toUpperCase()}`;

function receiptText(p: Payment, u: Unit) {
  return [
    `إيصال استلام إيجار · ${receiptNo(p)}`,
    `المستأجر: ${u.tenant?.name ?? "—"}`,
    `العقار: ${u.name} · ${u.building}`,
    `عن شهر: ${monthName(p.month)} ${p.month.slice(0, 4)}`,
    `المبلغ: ${fmt(p.amount)} د.ب (${p.method})`,
    `التاريخ: ${p.date}`,
    `— إداراتي`,
  ].join("\n");
}

function invoiceText(p: Payment, u: Unit, no: number, seller: { name: string; trn: string }) {
  const gross = p.invAmount ?? p.amount;
  const { net, vat } = vatSplit(gross);
  return [
    `فاتورة ضريبية · Tax Invoice · ${invoiceLabel(no)}`,
    `المؤجر: ${seller.name} · الرقم الضريبي ${seller.trn}`,
    `المستأجر: ${u.tenant?.name ?? "—"}${u.tenant?.trn ? ` · الرقم الضريبي ${u.tenant.trn}` : ""}`,
    `إيجار ${u.name} · ${u.building} عن ${monthName(p.month)} ${p.month.slice(0, 4)}`,
    `الصافي: ${fmt(net)} د.ب · الضريبة 10%: ${fmt(vat)} د.ب · الإجمالي: ${fmt(gross)} د.ب`,
    `التاريخ: ${p.date}`,
  ].join("\n");
}

/** إيصال بهوية إداراتي: مشاركة (واتساب وغيره) أو نسخ أو طباعة. DW-035: وفاتورة ضريبية للإيجار التجاري */
export function ReceiptSheet({ value, onClose }: { value: ReceiptRef; onClose: () => void }) {
  const toast = useToast();
  const { data, issueInvoice, sync, creditPayment } = useStore();
  const [credit, setCredit] = useState<string | null>(null); // DW-037: مبلغ الإشعار الدائن (نص)
  const [creditErr, setCreditErr] = useState("");
  const [shown, setShown] = useState<ReceiptRef>(value);
  const [mode, setMode] = useState<"receipt" | "invoice">("receipt");
  useEffect(() => { if (value) { setShown(value); setMode("receipt"); setCredit(null); setCreditErr(""); } }, [value]);
  const vat = data.vat;
  const canInvoice = !!vat && !!shown && isCommercial(shown.unit);
  const live = shown ? data.payments.find((x) => x.id === shown.payment.id) ?? shown.payment : null;
  const cns = live ? (data.credits ?? []).filter((c) => c.payment.id === live.id) : [];
  const left = live ? creditable(data, live) : 0;
  const openInvoice = () => { if (shown) { issueInvoice(shown.payment.id); setMode("invoice"); } };

  const share = async () => {
    if (!shown || !live) return;
    const text = mode === "invoice" && vat && live.inv ? invoiceText(live, shown.unit, live.inv, vat) : receiptText(shown.payment, shown.unit);
    try {
      if ((await shareText(mode === "invoice" ? "فاتورة ضريبية" : "إيصال إيجار", text)) === "copied") toast({ text: "انسخ الإيصال، الصقه بالواتساب" });
    } catch { /* المستخدم سكّر المشاركة */ }
  };

  return (
    <Sheet open={!!value} onClose={onClose} title={mode === "invoice" ? "فاتورة ضريبية" : "إيصال استلام إيجار"}>
      {shown && live && mode === "invoice" && vat && live.inv ? (
        <div className="stack">
          <div className="receipt invoice" id="tax-invoice">
            <div className="receipt-top">
              <img src={logoUrl} alt="إداراتي" height={30} />
              <div style={{ textAlign: "end" }}>
                <div className="strong">فاتورة ضريبية <span className="muted small" dir="ltr">Tax Invoice</span></div>
                <div className="num muted small" id="inv-no">{invoiceLabel(live.inv)}</div>
              </div>
            </div>
            <div className="inv-parties">
              <div><div className="muted small">المؤجر</div><div className="strong">{vat.name}</div><div className="small">{vat.address}</div><div className="small">الرقم الضريبي <span className="num" dir="ltr">{vat.trn}</span></div></div>
              <div><div className="muted small">المستأجر</div><div className="strong">{shown.unit.tenant?.name ?? "—"}</div>{shown.unit.tenant?.trn && <div className="small">الرقم الضريبي <span className="num" dir="ltr">{shown.unit.tenant.trn}</span></div>}</div>
            </div>
            <dl>
              <dt>تاريخ الفاتورة</dt><dd className="num">{live.date}</dd>
              <dt>الوصف</dt><dd>إيجار {shown.unit.name} · {shown.unit.building} عن {monthName(live.month)} <span className="num">{live.month.slice(0, 4)}</span></dd>
            </dl>
            {(() => { const gross = live.invAmount ?? live.amount; const { net, vat: tax } = vatSplit(gross); return (
              <table className="inv-table">
                <tbody>
                  <tr><th scope="row">المبلغ قبل الضريبة</th><td className="num">{fmt(net)} د.ب</td></tr>
                  <tr><th scope="row">ضريبة القيمة المضافة 10%</th><td className="num">{fmt(tax)} د.ب</td></tr>
                  <tr className="inv-total"><th scope="row">الإجمالي شامل الضريبة</th><td className="num">{fmt(gross)} د.ب</td></tr>
                </tbody>
              </table>
            ); })()}
            <img className="receipt-seal" src={sealUrl} alt="" />
          </div>
          {cns.length > 0 && <p className="muted small" style={{ margin: 0 }} id="inv-credited">عليها إشعار دائن: {cns.map((c) => `${creditLabel(c.no)} (${fmt(c.amount ?? c.payment.amount)} د.ب)`).join("، ")}. الباقي <span className="num">{fmt(left)}</span> د.ب.</p>}
          <div className={canPrint() ? "grid-2" : ""}>
            <button className="btn press" onClick={share}>مشاركة</button>
            {canPrint() && <button className="btn btn-ghost press" onClick={() => window.print()}>طباعة</button>}
          </div>
          {credit === null ? (
            <button className="btn btn-ghost press" id="credit-open" onClick={() => { setCredit(""); setCreditErr(""); }}>إشعار دائن (رجّعت مبلغ للمستأجر)</button>
          ) : (
            <div className="sync-box stack" id="credit-form">
              <label className="field"><span>المبلغ اللي رجّعته شامل الضريبة (الباقي {fmt(left)} د.ب)</span><input id="credit-amount" className="input num" inputMode="decimal" dir="ltr" value={credit} onChange={(e) => { setCredit(e.target.value); setCreditErr(""); }} /></label>
              {creditErr && <p className="field-error" role="alert">{creditErr}</p>}
              <p className="muted small" style={{ margin: 0 }}>الفاتورة تبقى مثل ما هي، ويطلع إشعار دائن برقمه. لو رجّعت الباقي كله، الدفعة تنلغي.</p>
              <div className="grid-2">
                <button className="btn press" id="credit-save" onClick={() => {
                  const f = parseBHD(credit);
                  if (f === null || f <= 0) return setCreditErr("اكتب المبلغ بالدينار، مثل 50 أو 45.500");
                  if (f > left) return setCreditErr(`أكثر من الباقي (${fmt(left)} د.ب)`);
                  const full = f === left;
                  creditPayment(live.id, f);
                  toast({ text: full ? "انطلع إشعار دائن وانلغت الدفعة" : `انطلع إشعار دائن بـ ${fmt(f)} د.ب` });
                  if (full) onClose(); else setCredit(null);
                }}>اطلع الإشعار</button>
                <button className="btn btn-ghost press" onClick={() => setCredit(null)}>إلغاء</button>
              </div>
            </div>
          )}
          <button className="link press" onClick={() => setMode("receipt")} style={{ justifySelf: "center" }}>رجوع للإيصال</button>
        </div>
      ) : shown && (
        <div className="stack">
          <div className="receipt" id="receipt">
            <div className="receipt-top">
              <img src={logoUrl} alt="إداراتي" height={30} />
              <div style={{ textAlign: "end" }}>
                <div className="strong">إيصال استلام إيجار</div>
                <div className="num muted small">{receiptNo(shown.payment)}</div>
              </div>
            </div>
            <dl>
              <dt>المستأجر</dt><dd>{shown.unit.tenant?.name ?? "—"}</dd>
              <dt>العقار</dt><dd>{shown.unit.name} · {shown.unit.building}</dd>
              <dt>عن شهر</dt><dd>{monthName(shown.payment.month)} <span className="num">{shown.payment.month.slice(0, 4)}</span></dd>
              <dt>الطريقة</dt><dd>{shown.payment.method}</dd>
              <dt>التاريخ</dt><dd className="num">{shown.payment.date}</dd>
            </dl>
            <div className="receipt-amt"><span>المبلغ المستلم</span><b className="num">{fmt(shown.payment.amount)} <small>د.ب</small></b></div>
            <img className="receipt-seal" src={sealUrl} alt="" />
            <p className="muted small" style={{ margin: "10px 0 0" }}>إيصال استلام، مو فاتورة ضريبية.</p>
          </div>
          <div className={canPrint() ? "grid-2" : ""}>
            <button className="btn press" onClick={share}>مشاركة</button>
            {canPrint() && <button className="btn btn-ghost press" onClick={() => window.print()}>طباعة</button>}
          </div>
          {canInvoice && !live?.inv && sync && typeof navigator !== "undefined" && !navigator.onLine && <p className="small inv-warn" style={{ margin: 0 }} id="inv-offline">أنت بدون نت: لو جهاز ثاني طلّع فاتورة بنفس الوقت، رقم الفاتورة يتعدّل بعد المزامنة. الأحسن تطلّعها وأنت متصل.</p>}
          {canInvoice && <button className="btn btn-ghost press" id="make-invoice" onClick={openInvoice}>{live?.inv ? `الفاتورة الضريبية ${invoiceLabel(live.inv)}` : "اطلع فاتورة ضريبية"}</button>}
          {vat && !isCommercial(shown.unit) && <p className="muted small" style={{ margin: 0 }} id="vat-exempt">الإيجار السكني معفى من الضريبة، فيكفي الإيصال.</p>}
        </div>
      )}
    </Sheet>
  );
}
