import { useRef, useState } from "react";
import { isData, useStore } from "../data/store";
import { backupDue, isoDay } from "../data/logic";
import { Chips, useToast } from "../ui/kit";
import { SyncPanel } from "./SyncPanel";
import { Reminders } from "./Reminders";
import { LockPanel } from "./LockPanel";
import { Feedback } from "./Feedback";
import { POLICY_VERSION } from "./Privacy";
import { loadSyncConfig } from "../data/sync";
import { ContractTemplateEditor } from "./Contract";
import { VatPanel } from "./VatPanel";
import symbolUrl from "../../brand/symbol.svg";
import pkg from "../../package.json";
import { getLastBackup, loadPrefs, savePrefs, setLastBackup, type Prefs, type TextSize, type Theme } from "../data/prefs";
import { isNative, saveFile } from "../native";

/** نسخة احتياطية، استرجاع، وحذف كل البيانات (حق المحو — PDPL) */
export function Settings() {
  const { data, replace, resetDemo, eraseAll, sync, anonymizeFormer } = useStore();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [error, setError] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [lastBackup, setLast] = useState(getLastBackup);
  const update = (p: Partial<Prefs>) => { const n = { ...prefs, ...p }; setPrefs(n); savePrefs(n); };

  const exportJson = async () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    try { await saveFile(`idarati-backup-${isoDay(new Date())}.json`, blob, "نسخة إداراتي الاحتياطية"); } catch { return; }
    const day = isoDay(new Date());
    setLastBackup(day); setLast(day);
    toast({ text: isNative() ? "انحفظت النسخة الاحتياطية" : "انحفظت النسخة الاحتياطية بالتنزيلات" });
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

      <Feedback />

      <Reminders />
      <LockPanel />

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

      <ContractTemplateEditor />
      <VatPanel />

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
          بدون حساب، كل شي على هالجهاز بس. مع حساب، تنحفظ كمان بسيرفر Supabase باليابان (برا البحرين)، ويشوفها حسابك واللي تدعيهم بس. ما فيه إعلانات ولا متتبعات، وما نجمع الرقم الشخصي (CPR).
        </p>
        <a className="link press" id="privacy-link" href="#privacy" style={{ justifySelf: "start" }}>سياسة الخصوصية وشروط الاستخدام</a>
        {(() => { const c = loadSyncConfig(); return c?.consentAt ? <p className="muted small" style={{ margin: 0 }} id="consent-info">وافقت على نسخة <span className="num">{c.consentVersion ?? "قبل 2026-10-16"}</span> بتاريخ <span className="num">{c.consentAt.slice(0, 10)}</span>{c.consentVersion !== POLICY_VERSION ? " · فيه نسخة أحدث، اقرأها" : ""}</p> : null; })()}
        <div className="sync-box stack">
          <div className="strong">بيانات المستأجرين السابقين</div>
          <p className="muted small" style={{ margin: 0 }}>لو مستأجر سابق طلب مسح بياناته: يخفي اسمه من سجل التأمين (يصير «مستأجر سابق»). الدفعات والمبالغ تبقى للسجل المالي.</p>
          <button className="btn btn-ghost press" id="anonymize-btn" onClick={() => { const r = anonymizeFormer(); toast(r.count ? { text: `انخفت أسماء ${r.count} مستأجرين سابقين`, undo: r.undo } : { text: "ما فيه أسماء مستأجرين سابقين" }); }}>أخفِ أسماء المستأجرين السابقين</button>
        </div>
      </section>
      <section className="card stack about-card" id="about" aria-labelledby="about-h">
        <div className="about-head">
          <img src={symbolUrl} alt="" width={52} height={52} />
          <div>
            <h2 className="set-title" id="about-h" style={{ margin: 0 }}>إداراتي</h2>
            <div className="muted small">يرتّب إيجاراتك وعقاراتك · <span dir="ltr">BY WADQA</span></div>
          </div>
        </div>
        <dl className="about-list">
          <dt>النسخة</dt><dd className="num">{pkg.version}</dd>
          <dt>الحالة</dt><dd>قيد التطوير · نسخة تجريبية</dd>
        </dl>
        <a className="link press" id="about-page" href="about.html" style={{ justifySelf: "start" }}>صفحة التعريف (للمشاركة)</a>
      </section>
      <p className="demo-note">إداراتي · قيد التطوير · نسخة تجريبية</p>
    </div>
  );
}
