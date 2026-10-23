import { useEffect, useState } from "react";
import type { Payment, Unit } from "../data/types";
import { fmt, invoiceLabel, isCommercial, monthName, vatSplit } from "../data/logic";
import { useStore } from "../data/store";
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
  const { net, vat } = vatSplit(p.amount);
  return [
    `فاتورة ضريبية · Tax Invoice · ${invoiceLabel(no)}`,
    `المؤجر: ${seller.name} · الرقم الضريبي ${seller.trn}`,
    `المستأجر: ${u.tenant?.name ?? "—"}${u.tenant?.trn ? ` · الرقم الضريبي ${u.tenant.trn}` : ""}`,
    `إيجار ${u.name} · ${u.building} عن ${monthName(p.month)} ${p.month.slice(0, 4)}`,
    `الصافي: ${fmt(net)} د.ب · الضريبة 10%: ${fmt(vat)} د.ب · الإجمالي: ${fmt(p.amount)} د.ب`,
    `التاريخ: ${p.date}`,
  ].join("\n");
}

/** إيصال بهوية إداراتي: مشاركة (واتساب وغيره) أو نسخ أو طباعة. DW-035: وفاتورة ضريبية للإيجار التجاري */
export function ReceiptSheet({ value, onClose }: { value: ReceiptRef; onClose: () => void }) {
  const toast = useToast();
  const { data, issueInvoice } = useStore();
  const [shown, setShown] = useState<ReceiptRef>(value);
  const [mode, setMode] = useState<"receipt" | "invoice">("receipt");
  useEffect(() => { if (value) { setShown(value); setMode("receipt"); } }, [value]);
  const vat = data.vat;
  const canInvoice = !!vat && !!shown && isCommercial(shown.unit);
  const live = shown ? data.payments.find((x) => x.id === shown.payment.id) ?? shown.payment : null;
  const openInvoice = () => { if (shown) { issueInvoice(shown.payment.id); setMode("invoice"); } };

  const share = async () => {
    if (!shown || !live) return;
    const text = mode === "invoice" && vat && live.inv ? invoiceText(live, shown.unit, live.inv, vat) : receiptText(shown.payment, shown.unit);
    try {
      if (navigator.share) { await navigator.share({ title: mode === "invoice" ? "فاتورة ضريبية" : "إيصال إيجار", text }); return; }
      await navigator.clipboard.writeText(text);
      toast({ text: "انسخ الإيصال، الصقه بالواتساب" });
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
            {(() => { const { net, vat: tax } = vatSplit(live.amount); return (
              <table className="inv-table">
                <tbody>
                  <tr><th scope="row">المبلغ قبل الضريبة</th><td className="num">{fmt(net)} د.ب</td></tr>
                  <tr><th scope="row">ضريبة القيمة المضافة 10%</th><td className="num">{fmt(tax)} د.ب</td></tr>
                  <tr className="inv-total"><th scope="row">الإجمالي شامل الضريبة</th><td className="num">{fmt(live.amount)} د.ب</td></tr>
                </tbody>
              </table>
            ); })()}
            <img className="receipt-seal" src={sealUrl} alt="" />
          </div>
          <div className="grid-2">
            <button className="btn press" onClick={share}>مشاركة</button>
            <button className="btn btn-ghost press" onClick={() => window.print()}>طباعة</button>
          </div>
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
          <div className="grid-2">
            <button className="btn press" onClick={share}>مشاركة</button>
            <button className="btn btn-ghost press" onClick={() => window.print()}>طباعة</button>
          </div>
          {canInvoice && <button className="btn btn-ghost press" id="make-invoice" onClick={openInvoice}>{live?.inv ? `الفاتورة الضريبية ${invoiceLabel(live.inv)}` : "اطلع فاتورة ضريبية"}</button>}
          {vat && !isCommercial(shown.unit) && <p className="muted small" style={{ margin: 0 }} id="vat-exempt">الإيجار السكني معفى من الضريبة، فيكفي الإيصال.</p>}
        </div>
      )}
    </Sheet>
  );
}
