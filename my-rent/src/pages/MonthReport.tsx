import type { ReactNode } from "react";
import { useStore } from "../data/store";
import { arrears, billsDue, budget, chequesDue, collection, docAlerts, fmt, isoDay, monthLabel, unitStatus } from "../data/logic";
import { Sheet } from "../ui/kit";
import logoUrl from "../../brand/logo-horizontal.svg";
import { canPrint } from "../native";

const Row = ({ k, v }: { k: ReactNode; v: ReactNode }) => <tr><td>{k}</td><td className="num">{v}</td></tr>;

/** DW-029: تقرير الشهر للطباعة (A4) — يقرا بالأبيض والأسود */
export function MonthReportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useStore();
  if (!open) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const c = collection(data);
  const b = budget(data);
  const late = data.units.filter((u) => u.tenant && unitStatus(data, u) === "late");
  const chq = chequesDue(data, new Date(), 31);
  const docs = docAlerts(data);
  const bills = data.units.filter((u) => u.tenant).map((u) => ({ u, d: billsDue(data, u) })).filter((x) => x.d.amount > 0);
  const d = (f: number) => `${fmt(f)} د.ب`;

  return (
    <Sheet open={open} onClose={onClose} title="تقرير الشهر">
      <div className="stack">
        <div className="receipt month-report" id="month-report">
          <div className="receipt-top"><img src={logoUrl} alt="إداراتي" height={30} /><div className="num muted small">{isoDay(new Date())}</div></div>
          <h3 className="mr-title">تقرير {monthLabel(c.month)}</h3>
          <table className="st-table mr-table"><tbody>
            <Row k="المتوقع هالشهر" v={d(c.expected)} />
            <Row k="المحصّل" v={d(c.collected)} />
            <Row k="متأخرات على المستأجرين" v={d(c.owed)} />
            <Row k="وحدات شاغرة" v={c.vacant} />
            <Row k="مصروف الشهر" v={`${d(b.spent)} من ${d(b.limit)}`} />
          </tbody></table>
          {late.length > 0 && <><h4>المتأخرين</h4><table className="st-table mr-table"><tbody>{late.map((u) => <Row key={u.id} k={`${u.name} · ${u.tenant!.name}`} v={d(arrears(data, u).amount)} />)}</tbody></table></>}
          {b.cats.some((x) => x.spent > 0) && <><h4>المصاريف حسب الفئة</h4><table className="st-table mr-table"><tbody>{b.cats.filter((x) => x.spent > 0).map((x) => <Row key={x.id} k={x.name} v={d(x.spent)} />)}</tbody></table></>}
          {chq.length > 0 && <><h4>شيكات تستحق خلال شهر</h4><table className="st-table mr-table"><tbody>{chq.map(({ cheque: q }) => <Row key={q.id} k={`${data.units.find((u) => u.id === q.unitId)?.name ?? ""} · شيك ${q.number} · ${q.due}`} v={d(q.amount)} />)}</tbody></table></>}
          {bills.length > 0 && <><h4>فواتير كهرباء وماء غير مسددة (على المستأجر)</h4><table className="st-table mr-table"><tbody>{bills.map(({ u, d: x }) => <Row key={u.id} k={u.name} v={d(x.amount)} />)}</tbody></table></>}
          {docs.length > 0 && <><h4>وثائق تحتاج تجديد</h4><table className="st-table mr-table"><tbody>{docs.map(({ doc, left }) => <Row key={doc.id} k={doc.title} v={left! < 0 ? "منتهية" : `باقي ${left} يوم`} />)}</tbody></table></>}
          <p className="muted small" style={{ margin: "10px 0 0" }}>من الدفعات والمصاريف المسجلة بإداراتي · قيد التطوير · نسخة تجريبية</p>
        </div>
        {canPrint() ? <button className="btn press" onClick={() => window.print()}>طباعة / PDF</button> : <p className="muted small" style={{ margin: 0 }}>للطباعة أو PDF افتح إداراتي من المتصفح بالكمبيوتر.</p>}
      </div>
    </Sheet>
  );
}
