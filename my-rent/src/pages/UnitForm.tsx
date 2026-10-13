import { useEffect, useState, type ChangeEvent } from "react";
import type { Unit } from "../data/types";
import { useStore } from "../data/store";
import { fmt, monthKey, parseBHD } from "../data/logic";
import { Sheet, useToast } from "../ui/kit";

type Props = { open: boolean; unit: Unit | null; onClose: () => void; onSaved?: (u: Unit) => void };

/** إضافة أو تعديل وحدة ومستأجرها. ما فيه CPR (DW-014 · Legal: أقل بيانات). */
export function UnitForm({ open, unit, onClose, onSaved }: Props) {
  const { saveUnit } = useStore();
  const toast = useToast();
  const [f, setF] = useState({ name: "", building: "", rent: "", dueDay: "1", tenant: "", phone: "", since: "", until: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setF({
      name: unit?.name ?? "",
      building: unit?.building ?? "",
      rent: unit ? fmt(unit.rent) : "",
      dueDay: String(unit?.dueDay ?? 1),
      tenant: unit?.tenant?.name ?? "",
      phone: unit?.tenant?.phone ?? "",
      since: unit?.tenant?.since ?? monthKey(new Date()),
      until: unit?.tenant?.until ?? "",
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
    const saved = saveUnit({
      id: unit?.id,
      name: f.name.trim(),
      building: f.building.trim() || "بدون مبنى",
      rent,
      dueDay: day,
      tenant: f.tenant.trim() ? { name: f.tenant.trim(), phone: f.phone.trim(), since: f.since, until: f.until || undefined } : undefined,
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
        <div className="grid-2">
          <label className="field"><span>الإيجار الشهري (د.ب)</span><input id="u-rent" className="input num" inputMode="decimal" dir="ltr" value={f.rent} onChange={set("rent")} placeholder="200.000" /></label>
          <label className="field"><span>يستحق يوم</span><input id="u-day" className="input num" inputMode="numeric" dir="ltr" value={f.dueDay} onChange={set("dueDay")} /></label>
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
        {error && <div className="field-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-block press">{unit ? "احفظ التعديل" : "أضف الوحدة"}</button>
      </form>
    </Sheet>
  );
}
