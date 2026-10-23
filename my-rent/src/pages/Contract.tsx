import { useEffect, useRef, useState } from "react";
import type { Unit } from "../data/types";
import { useStore } from "../data/store";
import { DEFAULT_CONTRACT, fillContract, isoDay } from "../data/logic";
import { ACCEPT, checkFile, fetchFile, putLocal, removeFile, uploadCloud } from "../data/files";
import { Sheet, useToast } from "../ui/kit";
import logoUrl from "../../brand/logo-horizontal.svg";
import { canPrint, openFile, shareText } from "../native";

const uid = () => Math.random().toString(36).slice(2, 10);
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(n / 1024)}KB`);

/** عقد الوحدة (DW-020): النموذج الثابت معبّى ببيانات المستأجر + العقد الموقّع المرفوع */
export function ContractSheet({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  const { data, saveUnit } = useStore();
  const toast = useToast();
  const [shown, setShown] = useState<Unit | null>(unit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (unit) { setShown(unit); setError(""); } }, [unit]);

  // دايماً آخر نسخة من الوحدة (بعد الرفع أو الحذف)
  const u = shown ? data.units.find((x) => x.id === shown.id) ?? shown : null;
  const text = u ? fillContract(data.contractTemplate ?? DEFAULT_CONTRACT, u, data.contractOwner ?? "") : "";
  const cf = u?.contractFile;
  const oldTenant = !!(cf && u?.tenant && cf.tenant !== u.tenant.name);

  const share = async () => {
    try {
      if ((await shareText("عقد إيجار", text)) === "copied") toast({ text: "انسخ العقد، الصقه وين ما تبي" });
    } catch { /* سكّر المشاركة */ }
  };

  const upload = async (f: File) => {
    if (!u) return;
    const e = checkFile(f);
    if (e) return setError(e);
    setBusy(true); setError("");
    try {
      const id = "cf" + uid();
      await putLocal(id, f);
      let path: string | undefined;
      try { path = await uploadCloud(id, f, f.name); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
      const before = u.contractFile;
      saveUnit({ ...u, contractFile: { id, name: f.name, type: f.type, size: f.size, tenant: u.tenant?.name ?? "", uploadedAt: isoDay(new Date()), path } });
      if (before) void removeFile(before.id, before.path); // ملف واحد لكل وحدة: القديم ينمسح
      toast({ text: path ? "انحفظ العقد الموقّع بالسحابة" : "انحفظ العقد الموقّع على هالجهاز" });
    } catch {
      setError("ما قدرنا نحفظ الملف على هالجهاز");
    } finally { setBusy(false); }
  };

  const view = async () => {
    if (!cf) return;
    const blob = await fetchFile(cf.id, cf.path);
    if (!blob) return setError(cf.path ? "ما قدرنا نجيب الملف من السحابة. تأكد من النت" : "الملف محفوظ على جهاز ثاني");
    await openFile(cf.name, blob);
  };

  const remove = async () => {
    if (!u || !cf) return;
    const { contractFile: _drop, ...rest } = u;
    saveUnit(rest);
    await removeFile(cf.id, cf.path);
    toast({ text: "انحذف ملف العقد" });
  };

  return (
    <Sheet open={!!unit} onClose={onClose} title="العقد">
      {u && (
        <div className="stack">
          <div className="sync-box stack contract-file">
            <div className="strong">العقد الموقّع</div>
            {cf ? (
              <>
                <div className="small">{cf.name} <span className="muted num">· {kb(cf.size)} · {cf.uploadedAt}</span> <span className="muted">· {cf.path ? "بالسحابة" : "على هالجهاز"}</span></div>
                {oldTenant && <div className="field-error">هالملف لمستأجر سابق ({cf.tenant}). ارفع عقد {u.tenant?.name}.</div>}
                <div className="grid-2">
                  <button className="btn press" onClick={view}>افتح الملف</button>
                  <button className="btn btn-ghost press danger-text" onClick={remove}>احذفه</button>
                </div>
              </>
            ) : <p className="muted small" style={{ margin: 0 }}>ما فيه ملف. بعد التوقيع صوّر العقد أو ارفعه PDF.</p>}
            <button className="btn btn-ghost press" disabled={busy} onClick={() => file.current?.click()}>{busy ? "يرفع…" : cf ? "بدّل الملف" : "ارفع العقد الموقّع"}</button>
            <p className="muted small" style={{ margin: 0 }}>الملف فيه بيانات شخصية (مثل الـ CPR والتوقيع): ينحفظ بشكل خاص ويشوفه بس أنت واللي تدعيهم. PDF أو صورة، 10MB كحد أقصى.</p>
            <input ref={file} id="contract-file" type="file" accept={ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
            {error && <div className="field-error" role="alert">{error}</div>}
          </div>

          <div className="receipt contract" id="contract">
            <div className="receipt-top">
              <img src={logoUrl} alt="إداراتي" height={30} />
              <div className="num muted small">{isoDay(new Date())}</div>
            </div>
            <pre className="contract-text">{text}</pre>
          </div>
          <p className="muted small" style={{ margin: 0 }}>نموذج عام من نصك بالإعدادات، مو استشارة قانونية. راجعه مع محامي، وسجّل العقد بالجهة الرسمية المختصة.</p>
          <div className="grid-2">
            {canPrint() && <button className="btn press" onClick={() => window.print()}>طباعة / PDF</button>}
            <button className="btn btn-ghost press" onClick={share}>مشاركة النص</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** محرر نموذج العقد بالإعدادات: الخانات تنضاف بضغطة، ومعاينة بأول وحدة مؤجرة */
export function ContractTemplateEditor() {
  const { data, setContract } = useStore();
  const toast = useToast();
  const [tpl, setTpl] = useState(data.contractTemplate ?? DEFAULT_CONTRACT);
  const [owner, setOwner] = useState(data.contractOwner ?? "");
  const [preview, setPreview] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const sample = data.units.find((x) => x.tenant);
  const dirty = tpl !== (data.contractTemplate ?? DEFAULT_CONTRACT) || owner !== (data.contractOwner ?? "");

  const insert = (field: string) => {
    const el = area.current;
    const tag = `{${field}}`;
    if (!el) return setTpl(tpl + tag);
    const [a, b] = [el.selectionStart, el.selectionEnd];
    setTpl(tpl.slice(0, a) + tag + tpl.slice(b));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = a + tag.length; });
  };

  return (
    <section className="card stack" aria-labelledby="ct-h">
      <h2 className="set-title" id="ct-h">نموذج العقد</h2>
      <p className="muted small" style={{ margin: 0 }}>تكتبه مرة وحدة. مع كل مستأجر جديد تتعبّى الخانات بروحها من بيانات الوحدة. نموذج عام، راجعه مع محامي.</p>
      <label className="field"><span>اسم المؤجر (يطلع بالعقد)</span><input id="ct-owner" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} /></label>
      <div className="ct-fields" aria-label="الخانات">
        {["المستأجر", "هاتف المستأجر", "الوحدة", "المبنى", "الإيجار", "يوم الاستحقاق", "بداية العقد", "نهاية العقد", "التأمين", "المالك", "تاريخ اليوم"].map((f) => (
          <button key={f} type="button" className="chip press" onClick={() => insert(f)}>{`{${f}}`}</button>
        ))}
      </div>
      <textarea id="ct-text" aria-label="نص نموذج العقد" ref={area} className="input ct-area" value={tpl} onChange={(e) => setTpl(e.target.value)} rows={12} />
      {preview && sample && <pre className="contract-text ct-preview">{fillContract(tpl, sample, owner)}</pre>}
      <div className="grid-2">
        <button className="btn press" disabled={!dirty} onClick={() => { setContract(tpl, owner); toast({ text: "انحفظ نموذج العقد" }); }}>احفظ النموذج</button>
        <button className="btn btn-ghost press" disabled={!sample} onClick={() => setPreview((p) => !p)}>{preview ? "سكّر المعاينة" : `معاينة (${sample?.name ?? "—"})`}</button>
      </div>
      <button className="link press" style={{ justifySelf: "start" }} onClick={() => setTpl(DEFAULT_CONTRACT)}>رجّع النموذج الافتراضي</button>
    </section>
  );
}
