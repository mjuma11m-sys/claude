import { t } from "../i18n";
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
  const d = (f: number) => t("{v1} د.ب", { v1: fmt(f) });

  return (
    <Sheet open={open} onClose={onClose} title={t("تقرير الشهر")}>
      <div className="stack">
        <div className="receipt month-report" id="month-report">
          <div className="receipt-top"><img src={logoUrl} alt={t("إداراتي")} height={30} /><div className="num muted small">{isoDay(new Date())}</div></div>
          <h3 className="mr-title">{t("تقرير")} {monthLabel(c.month)}</h3>
          <table className="st-table mr-table"><tbody>
            <Row k={t("المتوقع هالشهر")} v={d(c.expected)} />
            <Row k={t("المحصّل")} v={d(c.collected)} />
            <Row k={t("متأخرات على المستأجرين")} v={d(c.owed)} />
            <Row k={t("وحدات شاغرة")} v={c.vacant} />
            <Row k={t("مصروف الشهر")} v={t("{v1} من {v2}", { v1: d(b.spent), v2: d(b.limit) })} />
          </tbody></table>
          {late.length > 0 && <><h4>{t("المتأخرين")}</h4><table className="st-table mr-table"><tbody>{late.map((u) => <Row key={u.id} k={`${u.name} · ${u.tenant!.name}`} v={d(arrears(data, u).amount)} />)}</tbody></table></>}
          {b.cats.some((x) => x.spent > 0) && <><h4>{t("المصاريف حسب الفئة")}</h4><table className="st-table mr-table"><tbody>{b.cats.filter((x) => x.spent > 0).map((x) => <Row key={x.id} k={x.name} v={d(x.spent)} />)}</tbody></table></>}
          {chq.length > 0 && <><h4>{t("شيكات تستحق خلال شهر")}</h4><table className="st-table mr-table"><tbody>{chq.map(({ cheque: q }) => <Row key={q.id} k={t("{v1} · شيك {v2} · {v3}", { v1: data.units.find((u) => u.id === q.unitId)?.name ?? "", v2: q.number, v3: q.due })} v={d(q.amount)} />)}</tbody></table></>}
          {bills.length > 0 && <><h4>{t("فواتير كهرباء وماء غير مسددة (على المستأجر)")}</h4><table className="st-table mr-table"><tbody>{bills.map(({ u, d: x }) => <Row key={u.id} k={u.name} v={d(x.amount)} />)}</tbody></table></>}
          {docs.length > 0 && <><h4>{t("وثائق تحتاج تجديد")}</h4><table className="st-table mr-table"><tbody>{docs.map(({ doc, left }) => <Row key={doc.id} k={doc.title} v={left! < 0 ? t("منتهية") : t("باقي {v1} يوم", { v1: left! })} />)}</tbody></table></>}
          <p className="muted small" style={{ margin: "10px 0 0" }}>{t("من الدفعات والمصاريف المسجلة بإداراتي · قيد التطوير · نسخة تجريبية")}</p>
        </div>
        {canPrint() ? <button className="btn press" onClick={() => window.print()}>{t("طباعة / PDF")}</button> : <p className="muted small" style={{ margin: 0 }}>{t("للطباعة أو PDF افتح إداراتي من المتصفح بالكمبيوتر.")}</p>}
      </div>
    </Sheet>
  );
}
