import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FamilyMembers } from "./Family";
import { useStore } from "../data/store";
import { checkKey, checkUrl, loadSyncConfig, saveSyncConfig, type SyncConfig } from "../data/sync";
import { Chips, useToast } from "../ui/kit";

const CONSENT = "أوافق إن أسماء المستأجرين وأرقامهم والدفعات والمصاريف والملفات تنحفظ بالسحابة (Supabase، سيرفر باليابان — برا البحرين)، ويشوفها بس حسابي واللي أدعيهم من العائلة.";
const STATUS = { synced: "متزامن", pending: "يرفع…", offline: "بدون نت · ينرفع لما يرجع", error: "فيه مشكلة" } as const;

/** busy + error لكل زر يتصل بالسيرفر */
function useRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return { busy, error, run };
}

/** DW-019: مشروع إداراتي مدمج بالتطبيق (المفتاح العام بس) — ما يحتاج أحد يربط شي */
const BUILTIN = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_KEY
  ? { url: String(import.meta.env.VITE_SUPABASE_URL), key: String(import.meta.env.VITE_SUPABASE_KEY) } : null;

/** المزامنة بين أجهزة العائلة (DW-018). مطفية لين المالك يحط الرابط والمفتاح العام ويوافق — ما يطلع شي قبلها. */
export function SyncPanel() {
  const { sync } = useStore();
  const [cfg, setCfg] = useState<SyncConfig | null>(() => loadSyncConfig() ?? (BUILTIN ? { ...BUILTIN, consentAt: "" } : null));
  const [sb, setSb] = useState<SupabaseClient | null>(null);
  const [email, setEmail] = useState<string | null>(null); // null = ما سجّل دخول
  const [error, setError] = useState("");

  // إذا فيه إعداد: نجهّز الاتصال ونشوف الجلسة (ويلتقط ?code= من رابط الإيميل)
  useEffect(() => {
    if (!cfg) return;
    let alive = true;
    (async () => {
      const { getClient } = await import("../data/supabase");
      const c = await getClient(cfg.url, cfg.key);
      if (!alive) return;
      setSb(c);
      const { data } = await c.auth.getSession();
      if (alive) setEmail(data.session?.user.email ?? null);
      if (location.search.includes("code=")) history.replaceState(null, "", location.pathname + location.hash);
      c.auth.onAuthStateChange((_e, s) => { if (alive) setEmail(s?.user.email ?? null); });
    })().catch((e) => alive && setError(String(e.message ?? e)));
    return () => { alive = false; };
  }, [cfg]);

  if (sync) return <Connected />;
  if (!cfg) return <Setup onSaved={setCfg} />;

  return (
    <section className="card stack" aria-labelledby="sync-h">
      <h2 className="set-title" id="sync-h">حسابي والمزامنة</h2>
      {email === null && <p className="muted small" style={{ margin: 0 }}>اختياري: بدون حساب البيانات على هالجهاز بس. مع حساب تنحفظ بالسحابة، وكل حساب بياناته له بروحه.</p>}
      {email === null ? <SignIn sb={sb} needConsent={!cfg.consentAt} onConsent={(at) => { const c = { ...cfg, consentAt: at }; saveSyncConfig(c); setCfg(c); }} /> : (
        <>
          <p className="small" style={{ margin: 0 }}>داخل باسم <b className="num">{email}</b></p>
          <Family sb={sb!} cfg={cfg} />
        </>
      )}
      {error && <div className="field-error" role="alert">{error}</div>}
      {!BUILTIN && <button className="link press" style={{ justifySelf: "start" }} onClick={() => { saveSyncConfig(null); setCfg(null); }}>غيّر رابط المشروع</button>}
    </section>
  );
}

/** دخول أو حساب جديد بإيميل وكلمة سر (DW-019). الموافقة على التخزين بالسحابة قبل أول دخول على هالجهاز. */
function SignIn({ sb, needConsent, onConsent }: { sb: SupabaseClient | null; needConsent: boolean; onConsent: (at: string) => void }) {
  const { busy, error, run } = useRunner();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [addr, setAddr] = useState("");
  const [pass, setPass] = useState("");
  const [ok, setOk] = useState(false);
  const [note, setNote] = useState("");
  const submit = () => run(async () => {
    setNote("");
    if (!sb) throw new Error("الاتصال ما جهز، حاول مرة ثانية");
    if (!/^\S+@\S+\.\S+$/.test(addr.trim())) throw new Error("اكتب إيميل صحيح");
    if (pass.length < 8) throw new Error("كلمة السر 8 حروف أو أكثر");
    if (needConsent && !ok) throw new Error("لازم توافق على حفظ البيانات بالسحابة قبل");
    if (mode === "up") {
      const { data, error } = await sb.auth.signUp({ email: addr.trim(), password: pass, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw new Error(/registered/i.test(error.message) ? "هالإيميل عنده حساب. اختار «دخول»" : error.message);
      if (needConsent) onConsent(new Date().toISOString());
      if (!data.session) { setNote("أرسلنا رابط تأكيد لإيميلك. اضغطه، وبعدها ارجع هني واختار «دخول»."); setMode("in"); }
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email: addr.trim(), password: pass });
    if (error) throw new Error(/confirm/i.test(error.message) ? "أكّد إيميلك من الرابط اللي وصلك أول" : "الإيميل أو كلمة السر غلط");
    if (needConsent) onConsent(new Date().toISOString());
  });
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="chips" role="radiogroup" aria-label="نوع الدخول">
        <button type="button" role="radio" aria-checked={mode === "in"} className="chip press" onClick={() => setMode("in")}>دخول</button>
        <button type="button" role="radio" aria-checked={mode === "up"} className="chip press" onClick={() => setMode("up")}>حساب جديد</button>
      </div>
      <label className="field"><span>الإيميل</span><input id="sync-email" className="input" type="email" dir="ltr" autoComplete="email" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="name@example.com" /></label>
      <label className="field"><span>كلمة السر</span><input id="sync-pass" className="input" type="password" dir="ltr" autoComplete={mode === "up" ? "new-password" : "current-password"} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="8 حروف أو أكثر" /></label>
      {needConsent && <label className="check-row consent"><input id="sync-consent" type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> <span>{CONSENT} <a href="#privacy" className="link">اقرأ السياسة والشروط</a></span></label>}
      {note && <div className="backup-state" role="status">{note}</div>}
      <button className="btn press" disabled={busy || (needConsent && !ok)}>{mode === "up" ? "سوّ الحساب" : "دخول"}</button>
      {error && <div className="field-error" role="alert">{error}</div>}
    </form>
  );
}

function Family({ sb, cfg }: { sb: SupabaseClient; cfg: SyncConfig }) {
  const { connectSync } = useStore();
  const toast = useToast();
  const { busy, error, run } = useRunner();
  const [name, setName] = useState("بياناتي");
  const [code, setCode] = useState("");
  const [existing, setExisting] = useState<{ id: string; name: string; role: "owner" | "member"; canEdit: boolean } | null | undefined>(undefined);
  useEffect(() => { if (sb) import("../data/supabase").then(({ myFamily }) => myFamily(sb)).then(setExisting).catch(() => setExisting(null)); }, []);
  if (existing === undefined) return <p className="muted small">يتحقق…</p>;
  if (existing) return (
    <button className="btn press" disabled={busy} onClick={() => run(async () => {
      await connectSync({ ...cfg, familyId: existing.id, familyName: existing.name, role: existing.role, canEdit: existing.canEdit }, "join");
      toast({ text: `انربط الجهاز بـ${existing.name}` });
    })}>اربط هالجهاز بـ«{existing.name}»</button>
  );
  return (
    <>
      <div className="stack sync-box">
        <div className="strong">ابدأ مساحتك الخاصة</div>
        <p className="muted small" style={{ margin: 0 }}>بياناتك بحسابك بس. ما يشوفها أحد غيرك إلا اللي تعطيه كود دعوة.</p>
        <input id="sync-family" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        {(["create", "fresh"] as const).map((mode) => (
          <button key={mode} className={`btn press${mode === "fresh" ? " btn-ghost" : ""}`} disabled={busy || !name.trim()} onClick={() => run(async () => {
            const { createFamily } = await import("../data/supabase");
            const id = await createFamily(sb, name.trim());
            await connectSync({ ...cfg, familyId: id, familyName: name.trim(), role: "owner", canEdit: true }, mode);
            toast({ text: mode === "create" ? "انحفظت بياناتك بالسحابة" : "بدأت حسابك فاضي" });
          })}>{mode === "create" ? "ابدأ وارفع بيانات هالجهاز" : "ابدأ فاضي (بدون البيانات التجريبية)"}</button>
        ))}
      </div>
      <div className="stack sync-box">
        <div className="strong">أو انضم لعائلة بكود دعوة</div>
        <p className="muted small" style={{ margin: 0 }}>بيانات هالجهاز تتبدل ببيانات العائلة. خذ نسخة احتياطية قبل لو تحتاجها.</p>
        <input id="sync-code" className="input num" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC234" maxLength={6} />
        <button className="btn btn-ghost press" disabled={busy || code.trim().length !== 6} onClick={() => run(async () => {
          const { joinFamily, myFamily } = await import("../data/supabase");
          const id = await joinFamily(sb, code.trim());
          const fam = await myFamily(sb).catch(() => null);
          await connectSync({ ...cfg, familyId: id, familyName: fam?.name ?? "العائلة", role: "member", canEdit: fam?.canEdit !== false }, "join");
          toast({ text: "انضميت للعائلة" });
        })}>انضم</button>
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </>
  );
}

function Connected() {
  const { sync, disconnectSync, syncNow } = useStore();
  const toast = useToast();
  const { busy, error, run } = useRunner();
  const s = sync!;
  const [invite, setInvite] = useState("");
  const [inviteEdit, setInviteEdit] = useState<"edit" | "view">("edit");
  const [confirm, setConfirm] = useState(false);
  const waText = `كود الانضمام لإداراتي: ${invite} (صالح 48 ساعة${inviteEdit === "view" ? "، مشاهدة بس" : ""}). الإعدادات ← المزامنة ← عندك كود دعوة؟`;
  const withClient = async () => { const c = loadSyncConfig()!; const m = await import("../data/supabase"); return { m, c: await m.getClient(c.url, c.key) }; };
  return (
    <section className="card stack" aria-labelledby="sync-h">
      <h2 className="set-title" id="sync-h">المزامنة بين الأجهزة</h2>
      <div className="set-row">
        <span className="strong">{s.familyName || "العائلة"} <span className="muted small">· {s.role === "owner" ? "المالك" : s.canEdit ? "عضو يعدّل" : "مشاهدة بس"}</span></span>
        <span className={`sync-chip sync-${s.status}`} role="status">{STATUS[s.status]}{s.queued > 0 && <> · <span className="num">{s.queued}</span></>}</span>
      </div>
      {s.status === "error" && s.error && <div className="field-error">{s.error}</div>}
      {s.canEdit && <Chips<"edit" | "view"> label="صلاحية المدعو" value={inviteEdit} onChange={setInviteEdit} options={[{ id: "edit", label: "يعدّل" }, { id: "view", label: "مشاهدة بس" }]} />}
      <div className="grid-2">
        {s.canEdit && <button className="btn press" id="invite-btn" disabled={busy} onClick={() => run(async () => { const { m, c } = await withClient(); setInvite(await m.createInvite(c, s.familyId, inviteEdit === "edit")); })}>كود دعوة لجهاز ثاني</button>}
        <button className="btn btn-ghost press" onClick={syncNow}>زامن الحين</button>
      </div>
      {invite && (
        <div className="sync-box stack">
          <div className="invite-code num" aria-label="كود الدعوة">{invite}</div>
          <a className="btn btn-wa press" href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer">أرسله بالواتساب</a>
        </div>
      )}
      <FamilyMembers />
      <button className="btn btn-ghost press" onClick={() => { disconnectSync(); toast({ text: "توقفت المزامنة على هالجهاز. البيانات تبقى عليه" }); }}>أوقف المزامنة على هالجهاز</button>
      {!confirm ? (
        <button className="btn btn-ghost press danger-text" onClick={() => setConfirm(true)}>{s.role === "owner" ? "احذف بيانات العائلة من السيرفر" : "اطلع من العائلة"}</button>
      ) : (
        <div className="confirm-box" role="alert">
          <div className="strong">{s.role === "owner" ? "تنمسح كل بيانات العائلة من السيرفر، ولكل الأجهزة. هالجهاز يحتفظ بنسخته." : "تطلع من العائلة، وهالجهاز يحتفظ بنسخته."}</div>
          <div className="grid-2">
            <button className="btn btn-danger press" disabled={busy} onClick={() => run(async () => {
              const { m, c } = await withClient();
              if (s.role === "owner") await m.deleteFamily(c, s.familyId); else await m.leaveFamily(c, s.familyId);
              disconnectSync();
              toast({ text: s.role === "owner" ? "انمسحت بيانات العائلة من السيرفر" : "طلعت من العائلة" });
            })}>أكيد</button>
            <button className="btn btn-ghost press" onClick={() => setConfirm(false)}>إلغاء</button>
          </div>
        </div>
      )}
      {error && <div className="field-error" role="alert">{error}</div>}
    </section>
  );
}

/** الخطوة الأولى: رابط المشروع + المفتاح العام + الموافقة. المفتاح السري ينرفض. */
function Setup({ onSaved }: { onSaved: (c: SyncConfig) => void }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");
  const save = () => {
    const e = checkUrl(url) ?? checkKey(key) ?? (ok ? null : "لازم توافق على حفظ البيانات بالسيرفر قبل");
    if (e) return setError(e);
    const c = { url: url.trim().replace(/\/$/, ""), key: key.trim(), consentAt: new Date().toISOString() };
    saveSyncConfig(c);
    onSaved(c);
  };
  return (
    <section className="card stack" aria-labelledby="sync-h">
      <h2 className="set-title" id="sync-h">المزامنة بين الأجهزة</h2>
      <p className="muted small" style={{ margin: 0 }}>مطفية: البيانات على هالجهاز بس. عشان الوالد وأنت تشوفون نفس البيانات، حط مشروع Supabase حقك. ما يطلع شي من الجهاز قبل ما توافق وتنشئ العائلة.</p>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span>رابط المشروع (Project URL)</span><input id="sync-url" className="input" dir="ltr" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://xxxx.supabase.co" /></label>
        <label className="field"><span>المفتاح العام (anon public)</span><input id="sync-key" className="input" dir="ltr" value={key} onChange={(e) => { setKey(e.target.value); setError(""); }} placeholder="eyJ… أو sb_publishable_…" /></label>
        <label className="check-row consent"><input id="sync-consent" type="checkbox" checked={ok} onChange={(e) => { setOk(e.target.checked); setError(""); }} /> <span>{CONSENT} <a href="#privacy" className="link">اقرأ السياسة والشروط</a></span></label>
        {error && <div className="field-error" role="alert">{error}</div>}
        <button className="btn press" disabled={!ok}>احفظ وكمّل</button>
      </form>
    </section>
  );
}
