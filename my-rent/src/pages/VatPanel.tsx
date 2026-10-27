import { useEffect, useState } from "react";
import { useStore } from "../data/store";
import { validTrn } from "../data/logic";
import { useToast } from "../ui/kit";
import { t } from "../i18n";

/** DW-035: إعداد الفاتورة الضريبية — مقفلة لين المالك يحط رقمه الضريبي. للإيجار التجاري بس */
export function VatPanel() {
  const { data, setVat } = useStore();
  const toast = useToast();
  const on = !!data.vat;
  const [f, setF] = useState({ trn: "", name: "", address: "" });
  const [error, setError] = useState("");
  useEffect(() => { setF({ trn: data.vat?.trn ?? "", name: data.vat?.name ?? data.contractOwner ?? "", address: data.vat?.address ?? "" }); }, [data.vat, data.contractOwner]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = () => {
    setError("");
    if (!f.name.trim()) return setError(t("اكتب اسم المؤجر كما هو بشهادة التسجيل الضريبي"));
    if (!validTrn(f.trn)) return setError(t("الرقم الضريبي 15 رقم بالضبط"));
    if (!f.address.trim()) return setError(t("اكتب العنوان"));
    setVat({ trn: f.trn.trim(), name: f.name.trim(), address: f.address.trim() });
    toast({ text: on ? t("انحفظت بيانات الفاتورة") : t("انفعّلت الفاتورة الضريبية للمحلات") });
  };
  const off = () => { const before = data.vat; setVat(undefined); toast({ text: t("انوقفت الفاتورة الضريبية"), undo: () => setVat(before) }); };

  return (
    <section className="card stack" aria-labelledby="vat-h" id="vat-panel">
      <h2 className="set-title" id="vat-h">{t("الفاتورة الضريبية")}</h2>
      <p className="small" style={{ margin: 0 }}>
        {t("لو أنت مسجّل بضريبة القيمة المضافة: تطلع فاتورة ضريبية 10% لإيجار")} <b>{t("المحلات والمخازن والروضة")}</b>{t(". الإيجار السكني (شقة، بيت) معفى، فيطلع له إيصال بس.")}
      </p>
      <label className="field"><span>{t("اسم المؤجر (مثل الشهادة)")}</span><input id="vat-name" className="input" value={f.name} onChange={set("name")} autoComplete="organization" /></label>
      <label className="field"><span>{t("الرقم الضريبي (15 رقم)")}</span><input id="vat-trn" className="input num" inputMode="numeric" dir="ltr" maxLength={15} value={f.trn} onChange={set("trn")} /></label>
      <label className="field"><span>{t("العنوان")}</span><input id="vat-address" className="input" value={f.address} onChange={set("address")} autoComplete="street-address" /></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <p className="muted small" style={{ margin: 0 }}>{t("المبلغ اللي تسجّله = اللي استلمته")} <b>{t("شامل")}</b> {t("الضريبة، والفاتورة تحسب الصافي والضريبة منه. تأكد من المحاسب قبل أول فاتورة حقيقية.")}</p>
      <div className={on ? "grid-2" : ""}>
        <button className="btn press" id="vat-save" onClick={save}>{on ? t("احفظ") : t("فعّل الفاتورة الضريبية")}</button>
        {on && <button className="btn btn-ghost press" id="vat-off" onClick={off}>{t("أوقفها")}</button>}
      </div>
    </section>
  );
}
