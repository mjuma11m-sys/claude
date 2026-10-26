import { useState } from "react";
import { useStore } from "../data/store";
import { fmt, toCSV, yearReport } from "../data/logic";
import { Money } from "../theme/AppShell";
import { Chips, SectionHead, useToast } from "../ui/kit";
import { saveFile } from "../native";

/** DW-043: سنة كاملة لكل عقار (مبنى) — للمحاسب والزكاة. المصروف يدخل العقار لو انربط فيه بنموذج المصروف */
export function YearReport() {
  const { data } = useStore();
  const toast = useToast();
  const now = new Date();
  const years = [...new Set([now.getFullYear(), ...data.payments.map((p) => Number(p.month.slice(0, 4)))])].sort((a, b) => b - a).slice(0, 4);
  const [year, setYear] = useState(String(now.getFullYear())); // السنة الحالية، مو آخر سنة فيها دفعات مقدمة
  const r = yearReport(data, Number(year), now);

  const exportCsv = async () => {
    const rows: (string | number)[][] = [["العقار", "الوحدات", "المؤجرة", "الدخل (د.ب)", "المصروف (د.ب)", "الصافي (د.ب)", "ما اندفع (د.ب)"]];
    for (const x of r.rows) rows.push([x.building, x.units, x.rented, fmt(x.income), fmt(x.expense), fmt(x.net), fmt(x.owed)]);
    rows.push(["المجموع", "", "", fmt(r.income), fmt(r.expense), fmt(r.net), fmt(r.owed)]);
    if (r.unassigned) rows.push(["مصاريف غير مربوطة بعقار", "", "", "", fmt(r.unassigned), "", ""]);
    try { await saveFile(`idarati-${year}-year.csv`, new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" })); } catch { return; }
    toast({ text: `انحفظ تقرير ${year} (${r.rows.length} عقار)` });
  };

  return (
    <section className="card stack" id="year-report" aria-label="التقرير السنوي لكل عقار">
      <SectionHead title={`سنة ${year} لكل عقار`} action={<button className="link press" id="year-csv" onClick={exportCsv}>CSV</button>} />
      {years.length > 1 && <Chips label="السنة" value={year} onChange={setYear} options={years.map((y) => ({ id: String(y), label: String(y) }))} />}
      <div className="tbl-scroll" role="region" aria-label={`التقرير السنوي ${year}`} tabIndex={0}>
        <table className="tbl">
          <thead><tr><th>العقار</th><th>الدخل</th><th>المصروف</th><th>الصافي</th><th>ما اندفع</th></tr></thead>
          <tbody>
            {r.rows.map((x) => (
              <tr key={x.building}>
                <td><span className="strong">{x.building}</span> <span className="muted small">· {x.rented}/{x.units}</span></td>
                <td><Money fils={x.income} /></td>
                <td><Money fils={x.expense} /></td>
                <td><Money fils={x.net} tone={x.net >= 0 ? "in" : "out"} /></td>
                <td><Money fils={x.owed} tone={x.owed ? "out" : undefined} /></td>
              </tr>
            ))}
            <tr className="tbl-total">
              <td className="strong">المجموع</td><td><Money fils={r.income} /></td><td><Money fils={r.expense} /></td>
              <td><Money fils={r.net} tone={r.net >= 0 ? "in" : "out"} /></td><td><Money fils={r.owed} /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ margin: 0 }} id="year-unassigned">
        {r.unassigned ? <>مصاريف <span className="num">{fmt(r.unassigned)}</span> د.ب بهالسنة مو مربوطة بعقار (ما دخلت بالجدول). اربط المصروف بالعقار من نموذج المصروف.</> : "المصروف يدخل العقار لو اخترت العقار بنموذج المصروف."}
      </p>
    </section>
  );
}
