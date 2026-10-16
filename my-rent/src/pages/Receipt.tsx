import { useEffect, useState } from "react";
import type { Payment, Unit } from "../data/types";
import { fmt, monthName } from "../data/logic";
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

/** إيصال بهوية إداراتي: مشاركة (واتساب وغيره) أو نسخ أو طباعة */
export function ReceiptSheet({ value, onClose }: { value: ReceiptRef; onClose: () => void }) {
  const toast = useToast();
  const [shown, setShown] = useState<ReceiptRef>(value);
  useEffect(() => { if (value) setShown(value); }, [value]);

  const share = async () => {
    if (!shown) return;
    const text = receiptText(shown.payment, shown.unit);
    try {
      if (navigator.share) { await navigator.share({ title: "إيصال إيجار", text }); return; }
      await navigator.clipboard.writeText(text);
      toast({ text: "انسخ الإيصال، الصقه بالواتساب" });
    } catch { /* المستخدم سكّر المشاركة */ }
  };

  return (
    <Sheet open={!!value} onClose={onClose} title="إيصال استلام إيجار">
      {shown && (
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
        </div>
      )}
    </Sheet>
  );
}
