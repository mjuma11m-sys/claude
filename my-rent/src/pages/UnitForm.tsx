import { t } from "../i18n";
import { useEffect, useState, type ChangeEvent } from "react";
import type { Kind, Unit } from "../data/types";
import { useStore } from "../data/store";
import { KINDS, fmt, kindOf, monthKey, parseBHD } from "../data/logic";
import { Chips, Sheet, useToast } from "../ui/kit";

type Props = { open: boolean; unit: Unit | null; onClose: () => void; onSaved?: (u: Unit) => void };

/** إضافة أو تعديل وحدة ومستأجرها. ما فيه CPR (DW-014 · Legal: أقل بيانات). */
export function UnitForm({ open, unit, onClose, onSaved }: Props) {
  const { saveUnit } = useStore();
  const toast = useToast();
  const [f, setF] = useState({ name: "", building: "", rent: "", dueDay: "1", tenant: "", phone: "", since: "", until: "", deposit: "", elec: "", water: "", notes: "", trn: "" });
  const [lang, setLang] = useState<"ar" | "en">("ar"); // DW-043: لغة رسائل التذكير
  const [kind, setKind] = useState<Kind>("flat");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setKind(unit ? kindOf(unit) : "flat");
    setLang(unit?.tenant?.lang ?? "ar");
    setF({
      name: unit?.name ?? "",
      building: unit?.building ?? "",
      rent: unit ? fmt(unit.rent) : "",
      dueDay: String(unit?.dueDay ?? 1),
      tenant: unit?.tenant?.name ?? "",
      phone: unit?.tenant?.phone ?? "",
      since: unit?.tenant?.since ?? monthKey(new Date()),
      until: unit?.tenant?.until ?? "",
      deposit: unit?.tenant?.deposit ? fmt(unit.tenant.deposit) : "",
      trn: unit?.tenant?.trn ?? "",
      elec: unit?.meters?.elec ?? "",
      water: unit?.meters?.water ?? "",
      notes: unit?.notes ?? "",
    });
  }, [open, unit]);

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setError(""); };

  const submit = () => {
    const rent = parseBHD(f.rent);
    const day = Number(f.dueDay);
    if (!f.name.trim()) return setError(t("اكتب اسم الوحدة، مثل «شقة 6»"));
    if (rent === null) return setError(t("اكتب الإيجار بالدينار، مثل 200 أو 185.500"));
    if (f.trn.trim() && !/^\d{15}$/.test(f.trn.trim())) return setError(t("الرقم الضريبي للمستأجر 15 رقم بالضبط، أو خلّه فاضي"));
    if (!Number.isInteger(day) || day < 1 || day > 28) return setError(t("يوم الاستحقاق من 1 إلى 28"));
    if (f.tenant.trim() && !/^\d{4}-\d{2}$/.test(f.since)) return setError(t("اختار شهر بداية العقد"));
    if (f.until && f.until.slice(0, 7) < f.since) return setError(t("نهاية العقد قبل بدايته"));
    const deposit = f.deposit.trim() ? parseBHD(f.deposit) : 0;
    if (deposit === null) return setError(t("اكتب التأمين بالدينار، مثل 200، أو خلّه فاضي"));
    // سجل الإيجار (DW-024) يبقى لنفس المستأجر؛ المستأجر الجديد يبدأ بدون سجل
    const sameTenant = !!unit?.tenant && unit.tenant.name === f.tenant.trim() && unit.tenant.since === f.since;
    const saved = saveUnit({
      id: unit?.id,
      name: f.name.trim(),
      building: f.building.trim() || t("بدون مبنى"),
      kind,
      ...(unit?.contractFile ? { contractFile: unit.contractFile } : {}), // التعديل ما يمسح ملف العقد
      ...(sameTenant && unit?.rentBefore ? { rentBefore: unit.rentBefore } : {}),
      ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
      ...(f.elec.trim() || f.water.trim() ? { meters: { ...(f.elec.trim() ? { elec: f.elec.trim() } : {}), ...(f.water.trim() ? { water: f.water.trim() } : {}) } } : {}),
      rent,
      dueDay: day,
      tenant: f.tenant.trim() ? { name: f.tenant.trim(), phone: f.phone.trim(), since: f.since, until: f.until || undefined, ...(deposit ? { deposit } : {}), ...(f.trn.trim() && ["shop", "store", "nursery"].includes(kind) ? { trn: f.trn.trim() } : {}), ...(lang === "en" ? { lang } : {}) } : undefined,
    });
    onClose();
    toast({ text: unit ? t("انحفظ تعديل {v1}", { v1: saved.name }) : t("انضافت {v1}", { v1: saved.name }) });
    onSaved?.(saved);
  };

  return (
    <Sheet open={open} onClose={onClose} title={unit ? t("تعديل {v1}", { v1: unit.name }) : t("وحدة جديدة")}>
      <form className="pay-form unit-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid-2">
          <label className="field"><span>{t("اسم الوحدة")}</span><input id="u-name" className="input" value={f.name} onChange={set("name")} placeholder={t("شقة 6")} /></label>
          <label className="field"><span>{t("المبنى")}</span><input id="u-building" className="input" value={f.building} onChange={set("building")} placeholder={t("عمارة المالكية")} /></label>
        </div>
        {unit?.tenant && <p className="muted small" style={{ margin: 0 }}>{t("تعديل الإيجار هني يصحّح كل الأشهر. لزيادة من شهر معيّن استخدم «جدّد العقد».")}</p>}
        <Chips<Kind> label={t("نوع العقار")} value={kind} onChange={setKind} options={KINDS} />
        <div className="grid-2">
          <label className="field"><span>{t("الإيجار الشهري (د.ب)")}</span><input id="u-rent" className="input num" inputMode="decimal" dir="ltr" value={f.rent} onChange={set("rent")} placeholder="200.000" /></label>
          <label className="field"><span>{t("يستحق يوم")}</span><input id="u-day" className="input num" inputMode="numeric" dir="ltr" value={f.dueDay} onChange={set("dueDay")} /></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>{t("عداد الكهرباء")} <span className="muted small">{t("اختياري")}</span></span><input id="u-elec" className="input num" inputMode="numeric" dir="ltr" value={f.elec} onChange={set("elec")} /></label>
          <label className="field"><span>{t("عداد الماء")} <span className="muted small">{t("اختياري")}</span></span><input id="u-water" className="input num" inputMode="numeric" dir="ltr" value={f.water} onChange={set("water")} /></label>
        </div>
        <div className="form-sep">{t("المستأجر")} <span className="muted small">{t("(فاضي = الوحدة شاغرة)")}</span></div>
        <div className="grid-2">
          <label className="field"><span>{t("الاسم")}</span><input id="u-tenant" className="input" value={f.tenant} onChange={set("tenant")} /></label>
          <label className="field"><span>{t("الهاتف")}</span><input id="u-phone" className="input num" inputMode="tel" dir="ltr" value={f.phone} onChange={set("phone")} placeholder="3xxxxxxx" /></label>
        </div>
        {f.tenant.trim() && <Chips<"ar" | "en"> label={t("لغة رسائل التذكير")} value={lang} onChange={setLang} options={[{ id: "ar", label: t("عربي") }, { id: "en", label: "English" }]} />}
        <div className="grid-2 dates">
          <label className="field"><span>{t("بداية العقد (شهر)")}</span><input id="u-since" className="input num" type="month" dir="ltr" placeholder="2026-03" pattern="\d{4}-\d{2}" value={f.since} onChange={set("since")} /></label>
          <label className="field"><span>{t("نهاية العقد")}</span><input id="u-until" className="input num" type="date" dir="ltr" value={f.until} onChange={set("until")} /></label>
        </div>
        {["shop", "store", "nursery"].includes(kind) && (
          <label className="field"><span>{t("الرقم الضريبي للمستأجر (اختياري، للفاتورة الضريبية)")}</span><input id="u-trn" className="input num" inputMode="numeric" dir="ltr" maxLength={15} value={f.trn} onChange={set("trn")} /></label>
        )}
        <label className="field"><span>{t("التأمين (د.ب)")} <span className="muted small">{t("اختياري · يرجع وقت الإخلاء")}</span></span><input id="u-deposit" className="input num" inputMode="decimal" dir="ltr" value={f.deposit} onChange={set("deposit")} placeholder="0.000" /></label>
        <label className="field"><span>{t("ملاحظات")} <span className="muted small">{t("اختياري · مثل «المكيف تبدّل 2026»")}</span></span><textarea id="u-notes" className="input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
        {error && <div className="field-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-block press">{unit ? t("احفظ التعديل") : t("أضف الوحدة")}</button>
      </form>
    </Sheet>
  );
}
