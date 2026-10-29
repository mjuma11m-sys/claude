import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "../ui/kit";
import { t } from "../i18n";

/** DW-045: إضافات الدخول — قوقل/أبل، كلمة سر جديدة، رمز الخطوة الثانية، وإدارة التحقق بخطوتين */

function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return { busy, error, run };
}

/** أزرار أبل وقوقل — تطلع بس لو المزوّد مفعّل (VITE_AUTH_PROVIDERS="apple,google" وقت البناء، بعد ما ينفعّل بـ Supabase).
 *  ما نسأل السيرفر قبل الدخول: ولا طلب للسحابة قبل الموافقة. أبل أول وبنفس الحجم (شرط أبل 4.8) */
const PROVIDERS = String(import.meta.env.VITE_AUTH_PROVIDERS ?? "").split(",").map((x) => x.trim());
export function OAuthButtons({ sb, disabled, onStart }: { sb: SupabaseClient | null; disabled: boolean; onStart: () => void }) {
  const { busy, error, run } = useRun();
  // DW-050: بعد الموافقة بس نسأل المشروع شنو مفعّل فعلاً — زر مزوّد ما انحفظ بـ Supabase ما يطلع
  const [live, setLive] = useState<{ apple: boolean; google: boolean } | null>(null);
  const wanted = PROVIDERS.includes("google") || PROVIDERS.includes("apple");
  useEffect(() => {
    if (disabled || !sb || !wanted) return;
    let off = false;
    void import("../data/supabase").then((m) => m.enabledProviders()).then((v) => { if (!off && v) setLive(v); });
    return () => { off = true; };
  }, [disabled, sb, wanted]);
  const p = { google: PROVIDERS.includes("google") && (live?.google ?? true), apple: PROVIDERS.includes("apple") && (live?.apple ?? true) };
  if (!p.google && !p.apple) return null;
  const go = (provider: "google" | "apple") => run(async () => {
    if (!sb) throw new Error(t("الاتصال ما جهز، حاول مرة ثانية"));
    onStart(); // الموافقة تنحفظ قبل ما نطلع لصفحة أبل/قوقل
    const { oauthSignIn } = await import("../data/supabase");
    await oauthSignIn(sb, provider);
  });
  return (
    <div className="stack oauth" id="oauth">
      {p.apple && <button type="button" className="btn btn-apple press" id="oauth-apple" disabled={disabled || busy} onClick={() => void go("apple")}>{t("تابع مع Apple")}</button>}
      {p.google && <button type="button" className="btn btn-ghost press" id="oauth-google" disabled={disabled || busy} onClick={() => void go("google")}>{t("تابع مع Google")}</button>}
      {disabled && <p className="muted small" style={{ margin: 0 }}>{t("وافق على الحفظ بالسحابة (تحت) عشان تكمل.")}</p>}
      <div className="or-sep" aria-hidden="true"><span>{t("أو بالإيميل")}</span></div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}

/** كلمة سر جديدة — بعد الضغط على رابط «نسيت كلمة السر» */
export function NewPassword({ sb, onDone }: { sb: SupabaseClient; onDone: () => void }) {
  const toast = useToast();
  const { busy, error, run } = useRun();
  const [a, setA] = useState(""), [b, setB] = useState("");
  const save = () => run(async () => {
    if (a.length < 8) throw new Error(t("كلمة السر 8 حروف أو أكثر"));
    if (a !== b) throw new Error(t("الكلمتين مو نفس الشي"));
    const { setNewPassword } = await import("../data/supabase");
    await setNewPassword(sb, a);
    toast({ text: t("تغيّرت كلمة السر") });
    onDone();
  });
  return (
    <form className="stack sync-box" id="new-pass" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="strong">{t("كلمة سر جديدة")}</div>
      <label className="field"><span>{t("كلمة السر الجديدة")}</span><input id="new-pass-1" className="input" type="password" dir="ltr" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} /></label>
      <label className="field"><span>{t("أعدها")}</span><input id="new-pass-2" className="input" type="password" dir="ltr" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} /></label>
      <button className="btn press" disabled={busy}>{t("احفظ")}</button>
      {error && <div className="field-error" role="alert">{error}</div>}
    </form>
  );
}

/** الخطوة الثانية عند الدخول: رمز من 6 أرقام من تطبيق المصادقة */
export function OtpStep({ sb, onDone, onCancel }: { sb: SupabaseClient; onDone: () => void; onCancel: () => void }) {
  const { busy, error, run } = useRun();
  const [code, setCode] = useState("");
  const verify = () => run(async () => {
    const m = await import("../data/supabase");
    const st = await m.mfaStatus(sb);
    if (!st.factorId) throw new Error(t("ما لقينا التحقق بخطوتين بالحساب"));
    await m.mfaVerify(sb, st.factorId, code);
    onDone();
  });
  return (
    <form className="stack sync-box" id="otp-step" onSubmit={(e) => { e.preventDefault(); void verify(); }}>
      <div className="strong">{t("الخطوة الثانية")}</div>
      <p className="muted small" style={{ margin: 0 }}>{t("افتح تطبيق المصادقة (Google Authenticator أو كلمات السر بالآيفون) واكتب رمز «إداراتي».")}</p>
      <input id="otp-code" className="input num otp" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" aria-label={t("رمز التحقق")} />
      <button className="btn press" disabled={busy || code.length !== 6}>{t("تحقق")}</button>
      <button type="button" className="link press" onClick={onCancel}>{t("اطلع من الحساب")}</button>
      {error && <div className="field-error" role="alert">{error}</div>}
    </form>
  );
}

/** تفعيل/إيقاف التحقق بخطوتين من الحساب */
export function TwoFactor({ sb }: { sb: SupabaseClient }) {
  const toast = useToast();
  const { busy, error, run } = useRun();
  const [st, setSt] = useState<{ enabled: boolean; factorId?: string } | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);
  const load = () => import("../data/supabase").then((m) => m.mfaStatus(sb)).then(setSt).catch(() => setSt({ enabled: false }));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!st) return null;
  return (
    <div className="stack sync-box" id="two-factor">
      <div className="strong">{t("التحقق بخطوتين")} {st.enabled && <span className="pill-ok">{t("مفعّل")}</span>}</div>
      <p className="muted small" style={{ margin: 0 }}>{t("بعد كلمة السر، يطلب رمز من تطبيق المصادقة على جوالك. حتى لو أحد عرف كلمة السر، ما يقدر يدخل بياناتك — والسيرفر نفسه يرفض بدون الرمز.")}</p>
      {!st.enabled && !enroll && <button className="btn press" id="mfa-start" disabled={busy} onClick={() => run(async () => { const m = await import("../data/supabase"); setEnroll(await m.mfaEnroll(sb)); })}>{t("فعّل التحقق بخطوتين")}</button>}
      {enroll && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); void run(async () => {
          const m = await import("../data/supabase");
          await m.mfaVerify(sb, enroll.factorId, code);
          setEnroll(null); setCode(""); await load(); toast({ text: t("تفعّل التحقق بخطوتين") });
        }); }}>
          <p className="small" style={{ margin: 0 }}>{t("١. امسح الرمز بتطبيق المصادقة (أو انسخ المفتاح).")}</p>
          <img src={enroll.qr} alt={t("رمز QR للتحقق بخطوتين")} width={180} height={180} className="mfa-qr" />
          <code className="num mfa-secret" dir="ltr">{enroll.secret}</code>
          <label className="field"><span>{t("٢. اكتب الرمز اللي يطلع")}</span><input id="mfa-code" className="input num otp" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" /></label>
          <button className="btn press" id="mfa-verify" disabled={busy || code.length !== 6}>{t("تأكيد وتفعيل")}</button>
        </form>
      )}
      {st.enabled && !confirmOff && <button className="btn btn-ghost press" id="mfa-off" onClick={() => setConfirmOff(true)}>{t("أوقف التحقق بخطوتين")}</button>}
      {st.enabled && confirmOff && (
        <div className="stack">
          <p className="small" style={{ margin: 0 }}>{t("متأكد؟ حسابك يرجع يحتاج كلمة السر بس.")}</p>
          <button className="btn btn-danger press" disabled={busy} onClick={() => run(async () => { const m = await import("../data/supabase"); await m.mfaDisable(sb, st.factorId!); setConfirmOff(false); await load(); toast({ text: t("وقف التحقق بخطوتين") }); })}>{t("نعم، أوقفه")}</button>
        </div>
      )}
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}
