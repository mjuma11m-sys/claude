import { useRef, useState } from "react";
import { isData, useStore } from "../data/store";
import { backupDue, isoDay } from "../data/logic";
import { Chips, useToast } from "../ui/kit";
import { SyncPanel } from "./SyncPanel";
import { getLastBackup, loadPrefs, savePrefs, setLastBackup, type Prefs, type TextSize, type Theme } from "../data/prefs";

/** نسخة احتياطية، استرجاع، وحذف كل البيانات (حق المحو — PDPL) */
export function Settings() {
  const { data, replace, resetDemo, eraseAll, sync } = useStore();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [error, setError] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [lastBackup, setLast] = useState(getLastBackup);
  const update = (p: Partial<Prefs>) => { const n = { ...prefs, ...p }; setPrefs(n); savePrefs(n); };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `idarati-backup-${isoDay(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    const day = isoDay(new Date());
    setLastBackup(day); setLast(day);
    toast({ text: "انحفظت النسخة الاحتياطية بالتنزيلات" });
  };

  const importJson = async (f: File) => {
    setError("");
    try {
      const parsed = JSON.parse(await f.text());
      if (!isData(parsed)) throw new Error("shape");
      const before = data;
      replace(parsed);
      toast({ text: "انسترجعت البيانات من الملف", undo: () => replace(before) });
    } catch {
      setError("الملف مو نسخة احتياطية من إداراتي. اختار ملف idarati-backup-….json");
    }
  };

  return (
    <div className="stack-lg">
      <section className="card stack">
        <h2 className="set-title">العرض</h2>
        <div className="set-row"><span>حجم الخط</span>
          <Chips<TextSize> label="حجم الخط" value={prefs.size} onChange={(size) => update({ size })} options={[{ id: "normal", label: "عادي" }, { id: "large", label: "كبير" }, { id: "xl", label: "أكبر" }]} />
        </div>
        <div className="set-row"><span>المظهر</span>
          <Chips<Theme> label="المظهر" value={prefs.theme} onChange={(theme) => update({ theme })} options={[{ id: "auto", label: "تلقائي" }, { id: "light", label: "فاتح" }, { id: "dark", label: "داكن" }]} />
        </div>
        <p className="muted small" style={{ margin: 0 }}>«تلقائي» يمشي على إعداد الجوال.</p>
      </section>

      <section className="card stack">
        <h2 className="set-title">النسخة الاحتياطية</h2>
        <p className="muted small" style={{ margin: 0 }}>البيانات الحين محفوظة على هالجهاز بس. خذ نسخة كل شهر على الأقل لين ينربط التطبيق بالسحابة.</p>
        <div className={`backup-state ${backupDue(lastBackup) ? "is-due" : ""}`} role="status">
          {lastBackup ? <>آخر نسخة: <span className="num">{lastBackup}</span></> : "ما فيه نسخة احتياطية لين الحين"}
        </div>
        <div className="grid-2">
          <button className="btn press" onClick={exportJson}>تنزيل نسخة</button>
          <button className="btn btn-ghost press" onClick={() => file.current?.click()} disabled={!!sync} title={sync ? "وقّف المزامنة أول: الاسترجاع يبدّل بيانات كل العائلة" : undefined}>استرجاع من ملف</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
        {error && <div className="field-error">{error}</div>}
      </section>

      <SyncPanel />

      {!sync && <section className="card stack">
        <h2 className="set-title">البيانات التجريبية</h2>
        <button className="btn btn-ghost press" onClick={() => { const before = data; resetDemo(); toast({ text: "رجعت البيانات التجريبية", undo: () => replace(before) }); }}>رجّع البيانات التجريبية</button>
      </section>}

      <section className="card stack danger-zone">
        <h2 className="set-title">حذف كل البيانات</h2>
        <p className="muted small" style={{ margin: 0 }}>يمسح المستأجرين والدفعات والمصاريف من هالجهاز. ما يرجع إلا من نسخة احتياطية.{sync && " المزامنة تتوقف على هالجهاز، وبيانات العائلة بالسيرفر ما تنمس."}</p>
        {!confirmErase ? (
          <button className="btn btn-danger press" onClick={() => setConfirmErase(true)}>احذف كل البيانات</button>
        ) : (
          <div className="grid-2">
            <button className="btn btn-danger press" onClick={() => { eraseAll(); setConfirmErase(false); toast({ text: "انحذفت كل البيانات" }); }}>أكيد، احذف</button>
            <button className="btn btn-ghost press" onClick={() => setConfirmErase(false)}>إلغاء</button>
          </div>
        )}
      </section>

      <section className="card stack">
        <h2 className="set-title">الخصوصية</h2>
        <p className="small" style={{ margin: 0 }}>
          إداراتي أداة للعائلة. نحفظ أسماء المستأجرين وأرقامهم والدفعات والمصاريف عشان إدارة الأملاك بس، على هالجهاز.
          لو فعّلت المزامنة، تنحفظ كمان على مشروع Supabase حقك (سيرفر برا البحرين) ويشوفها بس أعضاء العائلة اللي دعيتهم. ما نبيع ولا نشارك أي بيانات، وما فيه إعلانات ولا متتبعات. الخطوط من Google Fonts
          (يشوفون عنوان IP بس). أي مستأجر يبي بياناته أو يبي نمسحها يتواصل مع المالك مباشرة.
        </p>
      </section>
      <p className="demo-note">إداراتي · قيد التطوير · نسخة تجريبية</p>
    </div>
  );
}
