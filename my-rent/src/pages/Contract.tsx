import { useEffect, useRef, useState } from "react";
import type { ContractFile, Unit } from "../data/types";
import { useStore } from "../data/store";
import { DEFAULT_CONTRACT, activeContract, contractChanges, fillContract, isoDay, pastContracts } from "../data/logic";
import { ACCEPT, checkFile, fetchFile, putLocal, removeFile, uploadCloud } from "../data/files";
import { Sheet, useToast } from "../ui/kit";
import logoUrl from "../../brand/logo-horizontal.svg";
import { canPrint, openFile, shareText } from "../native";
import { isEn, t } from "../i18n";

const uid = () => Math.random().toString(36).slice(2, 10);
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(n / 1024)}KB`);

/** عقد الوحدة (DW-020): النموذج الثابت معبّى ببيانات المستأجر + العقد الموقّع المرفوع */
export function ContractSheet({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  const { data, saveUnit, signContract, removeContract } = useStore();
  const toast = useToast();
  const [shown, setShown] = useState<Unit | null>(unit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (unit) { setShown(unit); setError(""); } }, [unit]);

  // دايماً آخر نسخة من الوحدة (بعد الرفع أو الحذف)
  const u = shown ? data.units.find((x) => x.id === shown.id) ?? shown : null;
  // DW-047: المعتمد نص ثابت؛ بدونه مسودة حية من بيانات الوحدة
  const act = u ? activeContract(data, u.id) : undefined;
  const past = u ? pastContracts(data, u.id) : [];
  const changes = act && u ? contractChanges(act, u) : [];
  const text = act ? act.text : u?.tenant ? fillContract(data.contractTemplate ?? DEFAULT_CONTRACT, u, data.contractOwner ?? "") : "";
  const cf = u?.contractFile;
  const oldTenant = !act && !!(cf && u?.tenant && cf.tenant !== u.tenant.name);

  const sign = (fresh: boolean) => {
    if (!u) return;
    signContract(u.id);
    toast({ text: fresh ? "انعتمد عقد جديد، والقديم راح «العقود السابقة»" : "انعتمد العقد — يظل بهالبيانات حتى لو تعدّلت" });
  };

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
      const moved = !act && before && before.tenant !== (u.tenant?.name ?? ""); // ملف مستأجر سابق: يروح الأرشيف، ما ينمسح
      if (!act && u.tenant) signContract(u.id); // الرفع = توقيع: يعتمد العقد لو ما انعتمد
      saveUnit({ ...u, contractFile: { id, name: f.name, type: f.type, size: f.size, tenant: u.tenant?.name ?? "", uploadedAt: isoDay(new Date()), path } });
      if (before && !moved) void removeFile(before.id, before.path); // نفس العقد: الملف القديم ينبدل
      toast({ text: path ? "انحفظ العقد الموقّع بالسحابة" : "انحفظ العقد الموقّع على هالجهاز" });
    } catch {
      setError("ما قدرنا نحفظ الملف على هالجهاز");
    } finally { setBusy(false); }
  };

  const view = async (f: ContractFile | undefined = cf) => {
    if (!f) return;
    const blob = await fetchFile(f.id, f.path);
    if (!blob) return setError(f.path ? "ما قدرنا نجيب الملف من السحابة. تأكد من النت" : "الملف محفوظ على جهاز ثاني");
    await openFile(f.name, blob);
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
          {u.tenant && (act ? (
            <div className="sync-box stack" id="contract-status">
              <div className="strong">✓ العقد المعتمد <span className="muted small">· <bdi className="num">{act.signedAt}</bdi></span></div>
              {changes.length ? (
                <>
                  <div className="field-error" id="contract-changed">تغيّرت بعد الاعتماد: {changes.join("، ")}. العقد المعتمد يظل بالبيانات القديمة.</div>
                  <button className="btn press" id="contract-renew" onClick={() => sign(true)}>عقد جديد بالبيانات الحالية</button>
                </>
              ) : <p className="muted small" style={{ margin: 0 }}>نسخة ثابتة: لو عدّلت بيانات المستأجر بعدين، هالعقد ما يتغيّر.</p>}
            </div>
          ) : (
            <div className="sync-box stack" id="contract-status">
              <div className="strong">مسودة — ما انعتمدت</div>
              <p className="muted small" style={{ margin: 0 }}>تتعبّى من بيانات الوحدة الحين. لما توقّعون، اعتمدها عشان تثبت بهالبيانات.</p>
              <button className="btn press" id="contract-sign" onClick={() => sign(false)}>اعتمد العقد</button>
            </div>
          ))}
          {u.tenant && (<>
          <div className="sync-box stack contract-file">
            <div className="strong">العقد الموقّع</div>
            {cf ? (
              <>
                <div className="small">{cf.name} <span className="muted num">· {kb(cf.size)} · {cf.uploadedAt}</span> <span className="muted">· {cf.path ? "بالسحابة" : "على هالجهاز"}</span></div>
                {oldTenant && <div className="field-error">هالملف لمستأجر سابق ({cf.tenant}). ارفع عقد {u.tenant?.name}.</div>}
                <div className="grid-2">
                  <button className="btn press" onClick={() => void view()}>افتح الملف</button>
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
              <div className="num muted small">{act?.signedAt ?? isoDay(new Date())}</div>
            </div>
            <pre className="contract-text">{text}</pre>
          </div>
          <p className="muted small" style={{ margin: 0 }}>نموذج عام من نصك بالإعدادات، مو استشارة قانونية. راجعه مع محامي، وسجّل العقد بالجهة الرسمية المختصة.</p>
          <div className="grid-2">
            {canPrint() && <button className="btn press" onClick={() => window.print()}>طباعة / PDF</button>}
            <button className="btn btn-ghost press" onClick={share}>مشاركة النص</button>
          </div>
          </>)}

          {past.length > 0 && (
            <div className="stack" id="contract-archive">
              <div className="strong">العقود السابقة ({past.length})</div>
              {past.map((c) => (
                <details key={c.id} className="sync-box archive-item">
                  <summary><span className="strong">{c.tenant || "—"}</span> <span className="muted small">· من <bdi className="num">{c.signedAt}</bdi> لين <bdi className="num">{c.endedAt}</bdi></span></summary>
                  <div className="stack" style={{ marginTop: 10 }}>
                    {c.text ? <pre className="contract-text">{c.text}</pre> : <p className="muted small" style={{ margin: 0 }}>عقد قبل الأرشيف: الملف الموقّع بس.</p>}
                    <div className="grid-2">
                      {c.file && <button className="btn press" onClick={() => void view(c.file)}>افتح الملف الموقّع</button>}
                      <button className="btn btn-ghost press danger-text" onClick={() => { removeContract(c.id); toast({ text: "انحذف العقد من الأرشيف" }); }}>احذفه من الأرشيف</button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
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
      <h2 className="set-title" id="ct-h">{t("نموذج العقد")}</h2>
      <p className="muted small" style={{ margin: 0 }}>{t("تكتبه مرة وحدة. مع كل مستأجر جديد تتعبّى الخانات بروحها من بيانات الوحدة. نموذج عام، راجعه مع محامي.")}{isEn() && " The contract itself is an Arabic document for the tenant."}</p>
      <label className="field"><span>{t("اسم المؤجر (يطلع بالعقد)")}</span><input id="ct-owner" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} /></label>
      <div className="ct-fields" aria-label={t("الخانات")}>
        {["المستأجر", "هاتف المستأجر", "الوحدة", "المبنى", "الإيجار", "يوم الاستحقاق", "بداية العقد", "نهاية العقد", "التأمين", "المالك", "تاريخ اليوم"].map((f) => (
          <button key={f} type="button" className="chip press" onClick={() => insert(f)}>{`{${f}}`}</button>
        ))}
      </div>
      <textarea id="ct-text" aria-label={t("نص نموذج العقد")} ref={area} className="input ct-area" value={tpl} onChange={(e) => setTpl(e.target.value)} rows={12} />
      {preview && sample && <pre className="contract-text ct-preview">{fillContract(tpl, sample, owner)}</pre>}
      <div className="grid-2">
        <button className="btn press" disabled={!dirty} onClick={() => { setContract(tpl, owner); toast({ text: t("انحفظ نموذج العقد") }); }}>{t("احفظ النموذج")}</button>
        <button className="btn btn-ghost press" disabled={!sample} onClick={() => setPreview((p) => !p)}>{preview ? t("سكّر المعاينة") : t("معاينة ({name})", { name: sample?.name ?? "—" })}</button>
      </div>
      <button className="link press" style={{ justifySelf: "start" }} onClick={() => setTpl(DEFAULT_CONTRACT)}>{t("رجّع النموذج الافتراضي")}</button>
    </section>
  );
}
