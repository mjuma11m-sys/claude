import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FamilyMembers } from "./Family";
import { POLICY_VERSION } from "./Privacy";
import { useStore } from "../data/store";
import { checkKey, checkUrl, loadSyncConfig, saveSyncConfig, type SyncConfig } from "../data/sync";
import { Chips, useToast } from "../ui/kit";
import { NewPassword, OAuthButtons, OtpStep, TwoFactor } from "./AuthExtras";
import { t } from "../i18n";

const CONSENT = t("أوافق إن أسماء المستأجرين وأرقامهم والدفعات والمصاريف والملفات تنحفظ بالسحابة (Supabase، سيرفر باليابان — برا البحرين)، ويشوفها بس حسابي واللي أدعيهم من العائلة.");
const STATUS = { synced: t("متزامن"), pending: t("يرفع…"), offline: t("بدون نت · ينرفع لما يرجع"), error: t("فيه مشكلة") } as const;

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
  const [recover, setRecover] = useState(() => location.search.includes("recover=1")); // DW-045: رجع من رابط «نسيت كلمة السر»
  const [needOtp, setNeedOtp] = useState(false); // DW-045: مفعّل التحقق بخطوتين والجلسة للحين بكلمة السر بس

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
      const check = async (signedIn: boolean) => {
        if (!signedIn) { setNeedOtp(false); return; }
        const { mfaStatus } = await import("../data/supabase");
        const st = await mfaStatus(c).catch(() => null);
        if (alive) setNeedOtp(!!st?.needCode);
      };
      if (alive) { setEmail(data.session?.user.email ?? null); void check(!!data.session); }
      if (/[?&](code|recover)=/.test(location.search)) history.replaceState(null, "", location.pathname + location.hash);
      c.auth.onAuthStateChange((ev, s) => {
        if (!alive) return;
        setEmail(s?.user.email ?? null);
        if (ev === "PASSWORD_RECOVERY") setRecover(true);
        void check(!!s);
      });
    })().catch((e) => alive && setError(String(e.message ?? e)));
    return () => { alive = false; };
  }, [cfg]);

  // DW-045: تطبيق الجوال — رجوع من رابط الدخول أو الإيميل
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent<{ recover?: boolean; error?: string }>).detail; if (d.error) setError(d.error); if (d.recover) setRecover(true); };
    window.addEventListener("idarati:auth", on);
    return () => window.removeEventListener("idarati:auth", on);
  }, []);

  if (sync) return <Connected />;
  if (!cfg) return <Setup onSaved={setCfg} />;

  return (
    <section className="card stack" aria-labelledby="sync-h">
      <h2 className="set-title" id="sync-h">{t("حسابي والمزامنة")}</h2>
      {email === null && <p className="muted small" style={{ margin: 0 }}>{t("اختياري: بدون حساب البيانات على هالجهاز بس. مع حساب تنحفظ بالسحابة، وكل حساب بياناته له بروحه.")}</p>}
      {email === null ? <SignIn sb={sb} needConsent={!cfg.consentAt} onConsent={(at) => { const c = { ...cfg, consentAt: at, consentVersion: POLICY_VERSION }; saveSyncConfig(c); setCfg(c); }} /> : recover && sb ? (
        <NewPassword sb={sb} onDone={() => setRecover(false)} />
      ) : needOtp && sb ? (
        <OtpStep sb={sb} onDone={() => setNeedOtp(false)} onCancel={() => void sb.auth.signOut()} />
      ) : (
        <>
          <p className="small" style={{ margin: 0 }}>{t("داخل باسم")} <b className="num">{email}</b></p>
          <Family sb={sb!} cfg={cfg} />
          {sb && <TwoFactor sb={sb} />}
        </>
      )}
      {error && <div className="field-error" role="alert">{error}</div>}
      {!BUILTIN && <button className="link press" style={{ justifySelf: "start" }} onClick={() => { saveSyncConfig(null); setCfg(null); }}>{t("غيّر رابط المشروع")}</button>}
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
    if (!sb) throw new Error(t("الاتصال ما جهز، حاول مرة ثانية"));
    if (!/^\S+@\S+\.\S+$/.test(addr.trim())) throw new Error(t("اكتب إيميل صحيح"));
    if (pass.length < 8) throw new Error(t("كلمة السر 8 حروف أو أكثر"));
    if (needConsent && !ok) throw new Error(t("لازم توافق على حفظ البيانات بالسحابة قبل"));
    if (mode === "up") {
      const { data, error } = await sb.auth.signUp({ email: addr.trim(), password: pass, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw new Error(/registered/i.test(error.message) ? t("هالإيميل عنده حساب. اختار «دخول»") : error.message);
      if (needConsent) onConsent(new Date().toISOString());
      if (!data.session) { setNote(t("أرسلنا رابط تأكيد لإيميلك. اضغطه، وبعدها ارجع هني واختار «دخول».")); setMode("in"); }
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email: addr.trim(), password: pass });
    if (error) throw new Error(/confirm/i.test(error.message) ? t("أكّد إيميلك من الرابط اللي وصلك أول") : t("الإيميل أو كلمة السر غلط"));
    if (needConsent) onConsent(new Date().toISOString());
  });
  // DW-045: «نسيت كلمة السر» — رابط بالإيميل يرجّعه لشاشة كلمة سر جديدة
  const forgot = () => run(async () => {
    setNote("");
    if (!sb) throw new Error(t("الاتصال ما جهز، حاول مرة ثانية"));
    if (!/^\S+@\S+\.\S+$/.test(addr.trim())) throw new Error(t("اكتب إيميلك فوق أول، وبعدها اضغط «نسيت كلمة السر»"));
    const { sendPasswordReset } = await import("../data/supabase");
    await sendPasswordReset(sb, addr.trim());
    setNote(t("أرسلنا رابط لإيميلك. اضغطه وحط كلمة سر جديدة."));
  });
  // الموافقة على التخزين بالسحابة قبل أي دخول (حتى بأبل/قوقل)
  const oauthBlocked = needConsent && !ok;
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <OAuthButtons sb={sb} disabled={oauthBlocked} onStart={() => { if (needConsent) onConsent(new Date().toISOString()); }} />
      <div className="chips" role="radiogroup" aria-label={t("نوع الدخول")}>
        <button type="button" role="radio" aria-checked={mode === "in"} className="chip press" onClick={() => setMode("in")}>{t("دخول")}</button>
        <button type="button" role="radio" aria-checked={mode === "up"} className="chip press" onClick={() => setMode("up")}>{t("حساب جديد")}</button>
      </div>
      <label className="field"><span>{t("الإيميل")}</span><input id="sync-email" className="input" type="email" dir="ltr" autoComplete="email" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="name@example.com" /></label>
      <label className="field"><span>{t("كلمة السر")}</span><input id="sync-pass" className="input" type="password" dir="ltr" autoComplete={mode === "up" ? "new-password" : "current-password"} value={pass} onChange={(e) => setPass(e.target.value)} placeholder={t("8 حروف أو أكثر")} /></label>
      {needConsent && <label className="check-row consent"><input id="sync-consent" type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> <span>{CONSENT} <a href="#privacy" className="link">{t("اقرأ السياسة والشروط")}</a></span></label>}
      {note && <div className="backup-state" role="status">{note}</div>}
      <button className="btn press" disabled={busy || (needConsent && !ok)}>{mode === "up" ? t("سوّ الحساب") : t("دخول")}</button>
      {mode === "in" && <button type="button" className="link press" id="forgot" style={{ justifySelf: "start" }} disabled={busy} onClick={() => void forgot()}>{t("نسيت كلمة السر؟")}</button>}
      {error && <div className="field-error" role="alert">{error}</div>}
    </form>
  );
}

function Family({ sb, cfg }: { sb: SupabaseClient; cfg: SyncConfig }) {
  const { connectSync } = useStore();
  const toast = useToast();
  const { busy, error, run } = useRunner();
  const [name, setName] = useState(t("بياناتي"));
  const [code, setCode] = useState("");
  const [existing, setExisting] = useState<{ id: string; name: string; role: "owner" | "member"; canEdit: boolean } | null | undefined>(undefined);
  useEffect(() => { if (sb) import("../data/supabase").then(({ myFamily }) => myFamily(sb)).then(setExisting).catch(() => setExisting(null)); }, []);
  if (existing === undefined) return <p className="muted small">{t("يتحقق…")}</p>;
  if (existing) return (
    <button className="btn press" disabled={busy} onClick={() => run(async () => {
      await connectSync({ ...cfg, familyId: existing.id, familyName: existing.name, role: existing.role, canEdit: existing.canEdit }, "join");
      toast({ text: t("انربط الجهاز بـ{name}", { name: existing.name }) });
    })}>{t("اربط هالجهاز بـ«{name}»", { name: existing.name })}</button>
  );
  return (
    <>
      <div className="stack sync-box">
        <div className="strong">{t("ابدأ مساحتك الخاصة")}</div>
        <p className="muted small" style={{ margin: 0 }}>{t("بياناتك بحسابك بس. ما يشوفها أحد غيرك إلا اللي تعطيه كود دعوة.")}</p>
        <input id="sync-family" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        {(["create", "fresh"] as const).map((mode) => (
          <button key={mode} className={`btn press${mode === "fresh" ? " btn-ghost" : ""}`} disabled={busy || !name.trim()} onClick={() => run(async () => {
            const { createFamily } = await import("../data/supabase");
            const id = await createFamily(sb, name.trim());
            await connectSync({ ...cfg, familyId: id, familyName: name.trim(), role: "owner", canEdit: true }, mode);
            toast({ text: mode === "create" ? t("انحفظت بياناتك بالسحابة") : t("بدأت حسابك فاضي") });
          })}>{mode === "create" ? t("ابدأ وارفع بيانات هالجهاز") : t("ابدأ فاضي (بدون البيانات التجريبية)")}</button>
        ))}
      </div>
      <div className="stack sync-box">
        <div className="strong">{t("أو انضم لعائلة بكود دعوة")}</div>
        <p className="muted small" style={{ margin: 0 }}>{t("بيانات هالجهاز تتبدل ببيانات العائلة. خذ نسخة احتياطية قبل لو تحتاجها.")}</p>
        <input id="sync-code" className="input num" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC234" maxLength={6} />
        <button className="btn btn-ghost press" disabled={busy || code.trim().length !== 6} onClick={() => run(async () => {
          const { joinFamily, myFamily } = await import("../data/supabase");
          const id = await joinFamily(sb, code.trim());
          const fam = await myFamily(sb).catch(() => null);
          await connectSync({ ...cfg, familyId: id, familyName: fam?.name ?? t("العائلة"), role: "member", canEdit: fam?.canEdit !== false }, "join");
          toast({ text: t("انضميت للعائلة") });
        })}>{t("انضم")}</button>
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
  const [confirmAcc, setConfirmAcc] = useState(false); // DW-038: حذف الحساب
  const waText = t("كود الانضمام لإداراتي: {code} (صالح 48 ساعة{view}). الإعدادات ← المزامنة ← عندك كود دعوة؟", { code: invite, view: inviteEdit === "view" ? t("، مشاهدة بس") : "" });
  const withClient = async () => { const c = loadSyncConfig()!; const m = await import("../data/supabase"); return { m, c: await m.getClient(c.url, c.key) }; };
  const [client, setClient] = useState<SupabaseClient | null>(null); // DW-045: للتحقق بخطوتين
  useEffect(() => { void withClient().then(({ c }) => setClient(c)).catch(() => setClient(null)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="card stack" aria-labelledby="sync-h">
      <h2 className="set-title" id="sync-h">{t("المزامنة بين الأجهزة")}</h2>
      <div className="set-row">
        <span className="strong">{s.familyName || t("العائلة")} <span className="muted small">· {s.role === "owner" ? t("المالك") : s.canEdit ? t("عضو يعدّل") : t("مشاهدة بس")}</span></span>
        <span className={`sync-chip sync-${s.status}`} role="status">{STATUS[s.status]}{s.queued > 0 && <> · <span className="num">{s.queued}</span></>}</span>
      </div>
      {s.status === "error" && s.error && <div className="field-error">{s.error}</div>}
      {s.canEdit && <Chips<"edit" | "view"> label={t("صلاحية المدعو")} value={inviteEdit} onChange={setInviteEdit} options={[{ id: "edit", label: t("يعدّل") }, { id: "view", label: t("مشاهدة بس") }]} />}
      <div className="grid-2">
        {s.canEdit && <button className="btn press" id="invite-btn" disabled={busy} onClick={() => run(async () => { const { m, c } = await withClient(); setInvite(await m.createInvite(c, s.familyId, inviteEdit === "edit")); })}>{t("كود دعوة لجهاز ثاني")}</button>}
        <button className="btn btn-ghost press" onClick={syncNow}>{t("زامن الحين")}</button>
      </div>
      {invite && (
        <div className="sync-box stack">
          <div className="invite-code num" aria-label={t("كود الدعوة")}>{invite}</div>
          <a className="btn btn-wa press" href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer">{t("أرسله بالواتساب")}</a>
        </div>
      )}
      <FamilyMembers />
      <button className="btn btn-ghost press" onClick={() => { disconnectSync(); toast({ text: t("توقفت المزامنة على هالجهاز. البيانات تبقى عليه") }); }}>{t("أوقف المزامنة على هالجهاز")}</button>
      {!confirm ? (
        <button className="btn btn-ghost press danger-text" onClick={() => setConfirm(true)}>{s.role === "owner" ? t("احذف بيانات العائلة من السيرفر") : t("اطلع من العائلة")}</button>
      ) : (
        <div className="confirm-box" role="alert">
          <div className="strong">{s.role === "owner" ? t("تنمسح كل بيانات العائلة من السيرفر، ولكل الأجهزة. هالجهاز يحتفظ بنسخته.") : t("تطلع من العائلة، وهالجهاز يحتفظ بنسخته.")}</div>
          <div className="grid-2">
            <button className="btn btn-danger press" disabled={busy} onClick={() => run(async () => {
              const { m, c } = await withClient();
              if (s.role === "owner") { await m.wipeFamilyFiles(c, s.familyId); await m.deleteFamily(c, s.familyId); } else await m.leaveFamily(c, s.familyId);
              disconnectSync();
              toast({ text: s.role === "owner" ? t("انمسحت بيانات العائلة من السيرفر") : t("طلعت من العائلة") });
            })}>{t("أكيد")}</button>
            <button className="btn btn-ghost press" onClick={() => setConfirm(false)}>{t("إلغاء")}</button>
          </div>
        </div>
      )}
      {client && <TwoFactor sb={client} />}
      {!confirmAcc ? (
        <button className="btn btn-ghost press danger-text" id="delete-account" onClick={() => setConfirmAcc(true)}>{t("احذف حسابي نهائياً")}</button>
      ) : (
        <div className="confirm-box" role="alert" id="delete-account-confirm">
          <div className="strong">{s.role === "owner"
            ? t("ينحذف حسابك (الإيميل وكلمة السر)، ومساحة العائلة كاملة وملفات العقود والوثائق من السحابة، لكل الأعضاء. ما يرجع.")
            : t("ينحذف حسابك (الإيميل وكلمة السر) وتطلع من العائلة. بيانات العائلة تبقى للمالك.")}</div>
          <p className="muted small" style={{ margin: 0 }}>{t("النسخة اللي على هالجهاز تبقى. تقدر تمسحها بعدين من «حذف كل البيانات».")}</p>
          <div className="grid-2">
            <button className="btn btn-danger press" id="delete-account-yes" disabled={busy} onClick={() => run(async () => {
              const { m, c } = await withClient();
              await m.deleteAccount(c, s.familyId, s.role);
              disconnectSync();
              toast({ text: t("انحذف حسابك من السيرفر") });
            })}>{t("احذف الحساب")}</button>
            <button className="btn btn-ghost press" onClick={() => setConfirmAcc(false)}>{t("إلغاء")}</button>
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
    const e = checkUrl(url) ?? checkKey(key) ?? (ok ? null : t("لازم توافق على حفظ البيانات بالسيرفر قبل"));
    if (e) return setError(e);
    const c = { url: url.trim().replace(/\/$/, ""), key: key.trim(), consentAt: new Date().toISOString(), consentVersion: POLICY_VERSION };
    saveSyncConfig(c);
    onSaved(c);
  };
  return (
    <section className="card stack" aria-labelledby="sync-h">
      <h2 className="set-title" id="sync-h">{t("المزامنة بين الأجهزة")}</h2>
      <p className="muted small" style={{ margin: 0 }}>{t("مطفية: البيانات على هالجهاز بس. عشان الوالد وأنت تشوفون نفس البيانات، حط مشروع Supabase حقك. ما يطلع شي من الجهاز قبل ما توافق وتنشئ العائلة.")}</p>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span>{t("رابط المشروع (Project URL)")}</span><input id="sync-url" className="input" dir="ltr" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://xxxx.supabase.co" /></label>
        <label className="field"><span>{t("المفتاح العام (anon public)")}</span><input id="sync-key" className="input" dir="ltr" value={key} onChange={(e) => { setKey(e.target.value); setError(""); }} placeholder={t("eyJ… أو sb_publishable_…")} /></label>
        <label className="check-row consent"><input id="sync-consent" type="checkbox" checked={ok} onChange={(e) => { setOk(e.target.checked); setError(""); }} /> <span>{CONSENT} <a href="#privacy" className="link">{t("اقرأ السياسة والشروط")}</a></span></label>
        {error && <div className="field-error" role="alert">{error}</div>}
        <button className="btn press" disabled={!ok}>{t("احفظ وكمّل")}</button>
      </form>
    </section>
  );
}
