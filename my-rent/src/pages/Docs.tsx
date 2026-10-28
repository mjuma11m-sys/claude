import { useEffect, useRef, useState } from "react";
import { useStore } from "../data/store";
import { DOC_KINDS, DOC_LABEL, docKindLabel, docsList, isoDay, type DocState } from "../data/logic";
import { ACCEPT, checkFile, fetchFile, putLocal, removeFile, uploadCloud } from "../data/files";
import type { Doc, DocKind } from "../data/types";
import { useStagger } from "../theme/motion";
import { Chips, DemoNote, EmptyState, Sheet, useToast } from "../ui/kit";
import { openFile } from "../native";
import { t } from "../i18n";

type KindF = "all" | DocKind;
type StateF = "all" | DocState;
const uid = () => Math.random().toString(36).slice(2, 10);

export function DocPill({ state, left }: { state: DocState; left: number | null }) {
  return (
    <span className={`pill doc-${state}`}>
      {state === "open" ? DOC_LABEL.open : state === "ended" ? <>{t("منتهية من")} <span className="num">{-left!}</span> {t("يوم")}</> : left === 0 ? t("تنتهي اليوم") : <>{t("باقي")} <span className="num">{left}</span> {t("يوم")}</>}
    </span>
  );
}

/** الوثائق والمستندات (DW-023): سجل تجاري، تأمين، رخص… مع حالة الانتهاء */
export function Docs({ onOpen }: { onOpen: (d: Doc) => void }) {
  const { data, loading } = useStore();
  const stagger = useStagger(loading);
  const [kind, setKind] = useState<KindF>("all");
  const [state, setState] = useState<StateF>("all");
  const all = docsList(data);
  const list = all.filter((d) => (kind === "all" || d.doc.kind === kind) && (state === "all" || d.state === state));
  const n = (s: DocState) => all.filter((d) => d.state === s).length;
  const unitName = (id?: string) => data.units.find((u) => u.id === id)?.name;

  return (
    <div className="stack-lg docs">
      <div className="doc-kpis" role="group" aria-label={t("حالة الوثائق")}>
        {(["ended", "soon", "active"] as DocState[]).map((s) => (
          <button key={s} className={`card kpi doc-kpi doc-kpi-${s} press`} aria-pressed={state === s} onClick={() => setState(state === s ? "all" : s)}>
            <b className="num">{n(s)}</b><span className="small">{DOC_LABEL[s]}</span>
          </button>
        ))}
      </div>
      {all.length > 0 && (
        <Chips<KindF> label={t("النوع")} value={kind} onChange={setKind} options={[{ id: "all", label: t("الكل"), count: all.length }, ...DOC_KINDS.map((k) => ({ ...k, count: all.filter((d) => d.doc.kind === k.id).length })).filter((k) => k.count)]} />
      )}
      {all.length === 0 ? <EmptyState text={t("ما فيه وثائق. أضف السجل التجاري أو التأمين من زر +")} /> : list.length === 0 ? <EmptyState text={t("ما فيه وثائق بهالتصفية.")} /> : (
        <ul className="rows rows-tap card-list" id="doc-list">
          {list.map(({ doc, state: s, left }, i) => {
            const st = stagger(i);
            return (
              <li key={doc.id} className={st.className} style={st.style}>
                <button className="row-btn press doc-row" onClick={() => onOpen(doc)}>
                  <span className="doc-main">
                    <span className="strong">{doc.title}</span>
                    <span className="muted small">{docKindLabel(doc.kind)}{unitName(doc.unitId) ? ` · ${unitName(doc.unitId)}` : ""}{doc.expires ? <> · <span className="num">{doc.expires}</span></> : ""}{doc.file ? " · 📎" : ""}</span>
                  </span>
                  <DocPill state={s} left={left} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small" style={{ margin: 0 }}>{t("للعقار والنشاط بس: سجلات، تأمين، رخص، شهادات. لا تحفظ هويات أو جوازات.")}</p>
      <DemoNote />
    </div>
  );
}

/** إضافة أو تعديل وثيقة + ملفها (نفس تخزين ملفات العقود) */
export function DocSheet({ value, onClose }: { value: { doc: Doc | null } | null; onClose: () => void }) {
  const { data, saveDoc, removeDoc } = useStore();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ kind: "cr" as DocKind, title: "", ref: "", unitId: "", expires: "" });
  const [picked, setPicked] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const doc = value?.doc ?? null;

  useEffect(() => {
    if (!value) return;
    const d = value.doc;
    setF({ kind: d?.kind ?? "cr", title: d?.title ?? "", ref: d?.ref ?? "", unitId: d?.unitId ?? "", expires: d?.expires ?? "" });
    setPicked(null); setError(""); setBusy(false);
  }, [value]);

  const submit = async () => {
    if (!f.title.trim()) return setError(t("اكتب اسم الوثيقة، مثل «سجل تجاري — محل 1»"));
    if (f.expires && !/^\d{4}-\d{2}-\d{2}$/.test(f.expires)) return setError(t("تاريخ الانتهاء مو صحيح"));
    let docFile = doc?.file;
    if (picked) {
      setBusy(true);
      try {
        const id = "df" + uid();
        await putLocal(id, picked);
        let path: string | undefined;
        try { path = await uploadCloud(id, picked, picked.name); } catch { /* يبقى محلي */ }
        if (doc?.file) void removeFile(doc.file.id, doc.file.path);
        docFile = { id, name: picked.name, type: picked.type, size: picked.size, uploadedAt: isoDay(new Date()), path };
      } catch { setBusy(false); return setError(t("ما قدرنا نحفظ الملف على هالجهاز")); }
      setBusy(false);
    }
    const saved = saveDoc({
      id: doc?.id, kind: f.kind, title: f.title.trim(),
      ...(f.ref.trim() ? { ref: f.ref.trim() } : {}), ...(f.unitId ? { unitId: f.unitId } : {}),
      ...(f.expires ? { expires: f.expires } : {}), ...(docFile ? { file: docFile } : {}),
    });
    onClose();
    toast({ text: doc ? t("انحفظ تعديل {v1}", { v1: saved.title }) : t("انضافت {v1}", { v1: saved.title }) });
  };

  const del = () => {
    if (!doc) return;
    const gone = removeDoc(doc.id);
    onClose();
    if (gone) toast({ text: t("انحذفت {v1}", { v1: gone.title }), undo: () => saveDoc(gone) });
  };

  const view = async () => {
    if (!doc?.file) return;
    const blob = await fetchFile(doc.file.id, doc.file.path);
    if (!blob) return setError(doc.file.path ? t("ما قدرنا نجيب الملف من السحابة. تأكد من النت") : t("الملف محفوظ على جهاز ثاني"));
    await openFile(doc.file.name, blob);
  };

  return (
    <Sheet open={!!value} onClose={onClose} title={doc ? t("تعديل الوثيقة") : t("وثيقة جديدة")}>
      <form className="pay-form doc-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Chips<DocKind> label={t("النوع")} value={f.kind} onChange={(kind) => setF({ ...f, kind })} options={DOC_KINDS} />
        <label className="field"><span>{t("اسم الوثيقة")}</span><input id="d-title" className="input" value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setError(""); }} placeholder={t("تأمين عمارة المالكية")} /></label>
        <div className="grid-2 dates">
          <label className="field"><span>{t("تاريخ الانتهاء")} <span className="muted small">{t("(فاضي = بدون)")}</span></span><input id="d-expires" className="input num" type="date" dir="ltr" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} /></label>
          <label className="field"><span>{t("الرقم")} <span className="muted small">{t("اختياري")}</span></span><input id="d-ref" className="input num" dir="ltr" value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></label>
        </div>
        <label className="field"><span>{t("الوحدة")} <span className="muted small">{t("اختياري")}</span></span>
          <select id="d-unit" className="input" value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value })}>
            <option value="">{t("العقار كله")}</option>
            {data.units.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.building}</option>)}
          </select>
        </label>
        <div className="sync-box stack">
          <div className="small">{picked ? <>{t("ملف جديد:")} {picked.name}</> : doc?.file ? <>📎 {doc.file.name} <span className="muted">· {doc.file.path ? t("بالسحابة") : t("على هالجهاز")}</span></> : <span className="muted">{t("بدون ملف (PDF أو صورة، 10MB)")}</span>}</div>
          <div className="grid-2">
            <button type="button" className="btn btn-ghost press" onClick={() => file.current?.click()}>{doc?.file || picked ? t("بدّل الملف") : t("أرفق ملف")}</button>
            {doc?.file && !picked && <button type="button" className="btn btn-ghost press" onClick={view}>{t("افتح الملف")}</button>}
          </div>
          <input ref={file} id="doc-file" type="file" accept={ACCEPT} hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (!x) return; const err = checkFile(x); if (err) return setError(err); setError(""); setPicked(x); }} />
        </div>
        <p className="muted small" style={{ margin: 0 }}>{t("لا تحفظ هويات أو جوازات أو بطاقات شخصية.")}</p>
        {error && <div className="field-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-block press" disabled={busy}>{busy ? t("يحفظ…") : doc ? t("احفظ التعديل") : t("أضف الوثيقة")}</button>
        {doc && <button type="button" className="btn btn-ghost btn-block press danger-text" onClick={del}>{t("احذف الوثيقة")}</button>}
      </form>
    </Sheet>
  );
}
