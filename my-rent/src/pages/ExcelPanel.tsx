import { t } from "../i18n";
import { useRef, useState } from "react";
import { useStore } from "../data/store";
import { isoDay } from "../data/logic";
import { exportSheets, planImport, templateSheets, type ImportPlan, type Sheet } from "../data/excel";
import { useToast } from "../ui/kit";
import { saveFile } from "../native";

const XLSX = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function save(sheets: { sheet: string; data: unknown[][] }[], fileName: string) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  type Sheets = Parameters<typeof writeXlsxFile>[0];
  const all = sheets.map((s) => ({ ...s, rightToLeft: true, columns: s.data[0].map(() => ({ width: 18 })) }));
  const blob = await writeXlsxFile(all as unknown as Sheets, {}).toBlob();
  await saveFile(fileName, blob, t("ملف Excel من إداراتي"));
}

/** Excel (DW-021): قالب · استيراد بمعاينة وأخطاء لكل صف · تصدير التقارير */
export function ExcelPanel() {
  const { data, importPlan } = useStore();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const read = async (f: File) => {
    setError(""); setPlan(null);
    if (!/\.xlsx$/i.test(f.name)) return setError(t("الملف لازم Excel بصيغة ‎.xlsx (احفظه من Excel: حفظ باسم ← xlsx)"));
    if (f.size > 5 * 1024 * 1024) return setError(t("الملف أكبر من 5MB"));
    setBusy(true);
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = (await readXlsxFile(f)) as unknown as Sheet[];
      const p = planImport(sheets, data);
      if (!p.counts.units && !p.counts.updated && !p.counts.payments && !p.counts.expenses && !p.errors.length) setError(t("ما لقينا بيانات. استخدم القالب: صفحات الوحدات والدفعات والمصاريف بعناوينها"));
      else setPlan(p);
    } catch {
      setError(t("ما قدرنا نقرأ الملف. تأكد إنه Excel ‎.xlsx ومو محمي بكلمة سر"));
    } finally { setBusy(false); }
  };

  const apply = () => {
    if (!plan) return;
    const undo = importPlan(plan);
    const c = plan.counts;
    toast({ text: t("انستورد: {v1} وحدة · {v2} دفعة · {v3} مصروف", { v1: c.units + c.updated, v2: c.payments, v3: c.expenses }), undo });
    setPlan(null);
  };

  const total = plan ? plan.counts.units + plan.counts.updated + plan.counts.payments + plan.counts.expenses : 0;

  return (
    <section className="card stack" aria-labelledby="xl-h">
      <h2 className="set-title" id="xl-h">Excel</h2>
      <p className="muted small" style={{ margin: 0 }}>{t("عندك بياناتك بملف Excel؟ نزّل القالب، عبّه أو الصق فيه، وارفعه. تشوف كل شي قبل ما يدخل.")}</p>
      <div className="grid-2">
        <button className="btn btn-ghost press" onClick={() => save(templateSheets(), "idarati-template.xlsx").catch(() => setError(t("ما قدرنا نجهز القالب")))}>{t("نزّل القالب")}</button>
        <button className="btn press" disabled={busy} onClick={() => file.current?.click()}>{busy ? t("يقرأ…") : t("ارفع ملف Excel")}</button>
      </div>
      <input ref={file} id="xl-file" type="file" accept={XLSX} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f); e.target.value = ""; }} />
      {error && <div className="field-error" role="alert">{error}</div>}

      {plan && (
        <div className="sync-box stack xl-preview" role="status">
          <div className="strong">{t("قبل الاستيراد")}</div>
          <ul className="xl-counts">
            {plan.counts.units > 0 && <li><b className="num">{plan.counts.units}</b> {t("وحدة جديدة")}</li>}
            {plan.counts.updated > 0 && <li><b className="num">{plan.counts.updated}</b> {t("وحدة تتحدّث")}</li>}
            {plan.counts.payments > 0 && <li><b className="num">{plan.counts.payments}</b> {t("دفعة")}</li>}
            {plan.counts.expenses > 0 && <li><b className="num">{plan.counts.expenses}</b> {t("مصروف")}</li>}
            {plan.cats.length > 0 && <li><b className="num">{plan.cats.length}</b> {t("فئة جديدة:")} {plan.cats.map((c) => c.name).join(t("، "))}</li>}
          </ul>
          {plan.warnings.map((w) => <div key={w} className="backup-state is-due small">{w}</div>)}
          {plan.errors.length > 0 && (
            <details open={plan.errors.length <= 5}>
              <summary className="field-error"><span className="num">{plan.errors.length}</span> {t("صف فيه خطأ — ما بيدخل")}</summary>
              <ul className="xl-errors">
                {plan.errors.slice(0, 50).map((e, i) => <li key={i}><span className="muted">{e.sheet} {t("· صف")} <span className="num">{e.row}</span>:</span> {e.msg}</li>)}
              </ul>
            </details>
          )}
          <div className="grid-2">
            <button className="btn press" disabled={!total} onClick={apply}>{t("استورد")} {total ? <span className="num">{total}</span> : null}</button>
            <button className="btn btn-ghost press" onClick={() => setPlan(null)}>{t("إلغاء")}</button>
          </div>
        </div>
      )}

      <button className="btn btn-ghost press" onClick={() => save(exportSheets(data), `idarati-${isoDay(new Date())}.xlsx`).then(() => toast({ text: t("انحفظ ملف Excel: 4 صفحات") })).catch(() => setError(t("ما قدرنا نجهز الملف")))}>{t("تصدير التقارير Excel")}</button>
    </section>
  );
}
