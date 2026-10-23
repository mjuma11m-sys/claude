import { useState } from "react";
import { useStore } from "../data/store";
import { creditLabel, fmt, invoiceLabel, monthName, vatSplit, vatSummary } from "../data/logic";
import type { CreditNote } from "../data/types";
import { Sheet } from "../ui/kit";
import logoUrl from "../../brand/logo-horizontal.svg";

/** DW-036: ملخص الضريبة لكل ربع (للإقرار) + الإشعارات الدائنة. يطلع بس لو الفاتورة مفعّلة أو فيه فواتير */
export function VatSummary() {
  const { data } = useStore();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [cn, setCn] = useState<CreditNote | null>(null);
  const hasAny = data.payments.some((p) => p.inv) || !!data.credits?.length;
  if (!data.vat && !hasAny) return null;
  const s = vatSummary(data, year);
  const credits = [...(data.credits ?? [])].sort((a, b) => b.no - a.no);

  return (
    <section className="card stack" id="vat-summary" aria-labelledby="vs-h">
      <div className="row-between">
        <h2 className="set-title" id="vs-h" style={{ margin: 0 }}>ملخص الضريبة</h2>
        <div className="vs-year">
          <button className="icon-btn press" aria-label="السنة اللي قبل" onClick={() => setYear(year - 1)}>›</button>
          <span className="num strong" id="vs-year">{year}</span>
          <button className="icon-btn press" aria-label="السنة اللي بعد" onClick={() => setYear(year + 1)}>‹</button>
        </div>
      </div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="ملخص الضريبة لكل ربع">
        <table className="vs-table">
          <thead><tr><th scope="col">الربع</th><th scope="col">فواتير</th><th scope="col">إشعارات دائنة</th><th scope="col">الصافي</th><th scope="col">الضريبة 10%</th></tr></thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.quarter}><th scope="row">الربع <span className="num">{r.quarter}</span></th><td className="num">{r.invoices}</td><td className="num">{r.credits}</td><td className="num">{fmt(r.net)}</td><td className="num">{fmt(r.vat)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><th scope="row">السنة</th><td /><td /><td className="num">{fmt(s.net)}</td><td className="num" id="vs-vat">{fmt(s.vat)}</td></tr></tfoot>
        </table>
      </div>
      <p className="muted small" style={{ margin: 0 }}>المبالغ بالدينار. الضريبة اللي جمعتها من الإيجار التجاري، ناقص الإشعارات الدائنة. للإقرار راجع المحاسب، وملف Excel فيه صفحة «الضريبة» بالتفاصيل.</p>
      {credits.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="strong small">الإشعارات الدائنة</div>
          <ul className="rows-tap" id="credit-list">
            {credits.map((c) => (
              <li key={c.id}>
                <button className="row-btn press" onClick={() => setCn(c)} aria-label={`إشعار دائن ${creditLabel(c.no)}`}>
                  <span><span className="num strong">{creditLabel(c.no)}</span> <span className="muted small">يخص {invoiceLabel(c.payment.inv ?? 0)} · {c.unit}</span></span>
                  <span className="num">−{fmt(c.payment.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CreditNoteSheet value={cn} onClose={() => setCn(null)} />
    </section>
  );
}

/** الإشعار الدائن: يلغي الفاتورة الأصلية بدون ما ينكسر التسلسل */
export function CreditNoteSheet({ value, onClose }: { value: CreditNote | null; onClose: () => void }) {
  const { data } = useStore();
  const vat = data.vat;
  const c = value;
  const split = c ? vatSplit(c.payment.amount) : { net: 0, vat: 0 };
  return (
    <Sheet open={!!c} onClose={onClose} title="إشعار دائن">
      {c && (
        <div className="stack">
          <div className="receipt invoice" id="credit-note">
            <div className="receipt-top">
              <img src={logoUrl} alt="إداراتي" height={30} />
              <div style={{ textAlign: "end" }}>
                <div className="strong">إشعار دائن <span className="muted small" dir="ltr">Credit Note</span></div>
                <div className="num muted small" id="cn-no">{creditLabel(c.no)}</div>
              </div>
            </div>
            <div className="inv-parties">
              <div><div className="muted small">المؤجر</div><div className="strong">{vat?.name ?? "—"}</div>{vat && <div className="small">الرقم الضريبي <span className="num" dir="ltr">{vat.trn}</span></div>}</div>
              <div><div className="muted small">المستأجر</div><div className="strong">{c.tenant}</div>{c.trn && <div className="small">الرقم الضريبي <span className="num" dir="ltr">{c.trn}</span></div>}</div>
            </div>
            <dl>
              <dt>التاريخ</dt><dd className="num">{c.date}</dd>
              <dt>يخص الفاتورة</dt><dd className="num" id="cn-ref">{invoiceLabel(c.payment.inv ?? 0)} · {c.payment.date}</dd>
              <dt>الوصف</dt><dd>إلغاء إيجار {c.unit} عن {monthName(c.payment.month)} <span className="num">{c.payment.month.slice(0, 4)}</span></dd>
            </dl>
            <table className="inv-table">
              <tbody>
                <tr><th scope="row">المبلغ قبل الضريبة</th><td className="num">−{fmt(split.net)} د.ب</td></tr>
                <tr><th scope="row">ضريبة القيمة المضافة 10%</th><td className="num">−{fmt(split.vat)} د.ب</td></tr>
                <tr className="inv-total"><th scope="row">الإجمالي</th><td className="num">−{fmt(c.payment.amount)} د.ب</td></tr>
              </tbody>
            </table>
          </div>
          <button className="btn btn-ghost press" onClick={() => window.print()}>طباعة</button>
        </div>
      )}
    </Sheet>
  );
}
