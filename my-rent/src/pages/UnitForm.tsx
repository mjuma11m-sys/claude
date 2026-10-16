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
  const [f, setF] = useState({ name: "", building: "", rent: "", dueDay: "1", tenant: "", phone: "", since: "", until: "", deposit: "", elec: "", water: "" });
  const [kind, setKind] = useState<Kind>("flat");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setKind(unit ? kindOf(unit) : "flat");
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
      elec: unit?.meters?.elec ?? "",
      water: unit?.meters?.water ?? "",
    });
  }, [open, unit]);

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setError(""); };

  const submit = () => {
    const rent = parseBHD(f.rent);
    const day = Number(f.dueDay);
    if (!f.name.trim()) return setError("اكتب اسم الوحدة، مثل «شقة 6»");
    if (rent === null) return setError("اكتب الإيجار بالدينار، مثل 200 أو 185.500");
    if (!Number.isInteger(day) || day < 1 || day > 28) return setError("يوم الاستحقاق من 1 إلى 28");
    if (f.tenant.trim() && !/^\d{4}-\d{2}$/.test(f.since)) return setError("اختار شهر بداية العقد");
    if (f.until && f.until.slice(0, 7) < f.since) return setError("نهاية العقد قبل بدايته");
    const deposit = f.deposit.trim() ? parseBHD(f.deposit) : 0;
    if (deposit === null) return setError("اكتب التأمين بالدينار، مثل 200، أو خلّه فاضي");
    const saved = saveUnit({
      id: unit?.id,
      name: f.name.trim(),
      building: f.building.trim() || "بدون مبنى",
      kind,
      ...(unit?.contractFile ? { contractFile: unit.contractFile } : {}), // التعديل ما يمسح ملف العقد
      ...(f.elec.trim() || f.water.trim() ? { meters: { ...(f.elec.trim() ? { elec: f.elec.trim() } : {}), ...(f.water.trim() ? { water: f.water.trim() } : {}) } } : {}),
      rent,
      dueDay: day,
      tenant: f.tenant.trim() ? { name: f.tenant.trim(), phone: f.phone.trim(), since: f.since, until: f.until || undefined, ...(deposit ? { deposit } : {}) } : undefined,
    });
    onClose();
    toast({ text: unit ? `انحفظ تعديل ${saved.name}` : `انضافت ${saved.name}` });
    onSaved?.(saved);
  };

  return (
    <Sheet open={open} onClose={onClose} title={unit ? `تعديل ${unit.name}` : "وحدة جديدة"}>
      <form className="pay-form unit-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid-2">
          <label className="field"><span>اسم الوحدة</span><input id="u-name" className="input" value={f.name} onChange={set("name")} placeholder="شقة 6" /></label>
          <label className="field"><span>المبنى</span><input id="u-building" className="input" value={f.building} onChange={set("building")} placeholder="عمارة المالكية" /></label>
        </div>
        {unit?.tenant && <p className="muted small" style={{ margin: 0 }}>تعديل الإيجار هني يصحّح كل الأشهر. لزيادة من شهر معيّن استخدم «جدّد العقد».</p>}
        <Chips<Kind> label="نوع العقار" value={kind} onChange={setKind} options={KINDS} />
        <div className="grid-2">
          <label className="field"><span>الإيجار الشهري (د.ب)</span><input id="u-rent" className="input num" inputMode="decimal" dir="ltr" value={f.rent} onChange={set("rent")} placeholder="200.000" /></label>
          <label className="field"><span>يستحق يوم</span><input id="u-day" className="input num" inputMode="numeric" dir="ltr" value={f.dueDay} onChange={set("dueDay")} /></label>
        </div>
        <div className="grid-2">
          <label className="field"><span>عداد الكهرباء <span className="muted small">اختياري</span></span><input id="u-elec" className="input num" inputMode="numeric" dir="ltr" value={f.elec} onChange={set("elec")} /></label>
          <label className="field"><span>عداد الماء <span className="muted small">اختياري</span></span><input id="u-water" className="input num" inputMode="numeric" dir="ltr" value={f.water} onChange={set("water")} /></label>
        </div>
        <div className="form-sep">المستأجر <span className="muted small">(فاضي = الوحدة شاغرة)</span></div>
        <div className="grid-2">
          <label className="field"><span>الاسم</span><input id="u-tenant" className="input" value={f.tenant} onChange={set("tenant")} /></label>
          <label className="field"><span>الهاتف</span><input id="u-phone" className="input num" inputMode="tel" dir="ltr" value={f.phone} onChange={set("phone")} placeholder="3xxxxxxx" /></label>
        </div>
        <div className="grid-2 dates">
          <label className="field"><span>بداية العقد (شهر)</span><input id="u-since" className="input num" type="month" dir="ltr" value={f.since} onChange={set("since")} /></label>
          <label className="field"><span>نهاية العقد</span><input id="u-until" className="input num" type="date" dir="ltr" value={f.until} onChange={set("until")} /></label>
        </div>
        <label className="field"><span>التأمين (د.ب) <span className="muted small">اختياري · يرجع وقت الإخلاء</span></span><input id="u-deposit" className="input num" inputMode="decimal" dir="ltr" value={f.deposit} onChange={set("deposit")} placeholder="0.000" /></label>
        {error && <div className="field-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-block press">{unit ? "احفظ التعديل" : "أضف الوحدة"}</button>
      </form>
    </Sheet>
  );
}
