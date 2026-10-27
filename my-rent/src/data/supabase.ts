// الاتصال بـ Supabase (DW-018). المكتبة تتحمل بس لما المزامنة تنفعّل — اللي ما يستخدمها ما ينزّلها.
// المفتاح العام (anon/publishable) بس، والحماية الحقيقية RLS بالسيرفر (supabase/migrations).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pending, Remote, Row } from "./sync";

let client: SupabaseClient | null = null;
let clientFor = "";

export async function getClient(url: string, key: string): Promise<SupabaseClient> {
  if (client && clientFor === url + key) return client;
  const { createClient } = await import("@supabase/supabase-js");
  client = createClient(url, key, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  clientFor = url + key;
  return client;
}

export function supabaseRemote(sb: SupabaseClient): Remote {
  return {
    async pull(familyId, afterId) {
      const out: Row[] = [];
      for (;;) { // صفحات 1000 صف
        const { data, error } = await sb.from("events").select("id, client_id, action")
          .eq("family_id", familyId).gt("id", out.length ? out[out.length - 1].id : afterId).order("id").limit(1000);
        if (error) throw new Error(error.message);
        out.push(...(data as Row[]));
        if (!data || data.length < 1000) return out;
      }
    },
    async push(familyId, ev: Pending) {
      const { error } = await sb.from("events").insert({ family_id: familyId, client_id: ev.client_id, action: ev.action });
      if (error && error.code !== "23505") throw new Error(error.message); // 23505 = انرفع قبل
    },
    subscribe(familyId, onChange) {
      const ch = sb.channel(`events:${familyId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "events", filter: `family_id=eq.${familyId}` }, () => onChange())
        .subscribe();
      return () => { void sb.removeChannel(ch); };
    },
  };
}

const rpcError = (m: string) =>
  /invalid or expired/.test(m) ? "الكود غلط أو انتهى (صالح 48 ساعة). اطلب كود جديد"
  : /owner only/.test(m) ? "المالك بس يقدر يسوي هالشي"
  : /editors only/.test(m) ? "صلاحيتك مشاهدة بس"
  : /not signed in/.test(m) ? "سجّل دخول أول"
  : m;

async function rpc<T>(sb: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(rpcError(error.message));
  return data as T;
}

export const createFamily = (sb: SupabaseClient, name: string) => rpc<string>(sb, "create_family", { family_name: name });
export const createInvite = (sb: SupabaseClient, familyId: string, canEdit = true) => rpc<string>(sb, "create_invite_as", { f: familyId, edit: canEdit });
export const setMyName = (sb: SupabaseClient, familyId: string, name: string) => rpc<void>(sb, "set_my_name", { f: familyId, n: name });
export const setMemberAccess = (sb: SupabaseClient, familyId: string, member: string, canEdit: boolean) => rpc<void>(sb, "set_member_access", { f: familyId, member, edit: canEdit });

export type Member = { user_id: string; role: "owner" | "member"; can_edit: boolean; display_name: string | null };
/** DW-030: أعضاء العائلة (RLS: الأعضاء بس يشوفونهم) + مين أنا */
export async function listMembers(sb: SupabaseClient, familyId: string): Promise<{ me: string; members: Member[] }> {
  const { data: u } = await sb.auth.getUser();
  const { data, error } = await sb.from("family_members").select("user_id, role, can_edit, display_name").eq("family_id", familyId).order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);
  return { me: u.user?.id ?? "", members: (data ?? []) as Member[] };
}
export type ActivityRow = { id: number; user_id: string; action: { type: string; [k: string]: unknown }; created_at: string };
/** DW-030: آخر الأحداث مع صاحبها (جدول events يحفظ user_id أصلاً) */
export async function recentEvents(sb: SupabaseClient, familyId: string, limit = 50): Promise<ActivityRow[]> {
  const { data, error } = await sb.from("events").select("id, user_id, action, created_at").eq("family_id", familyId).order("id", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityRow[];
}
export const joinFamily = (sb: SupabaseClient, code: string) => rpc<string>(sb, "join_family", { invite_code: code });
export const deleteFamily = (sb: SupabaseClient, familyId: string) => rpc<void>(sb, "delete_family", { f: familyId });
export const leaveFamily = (sb: SupabaseClient, familyId: string) => rpc<void>(sb, "leave_family", { f: familyId });

/** DW-038: يحذف كل ملفات العقود والوثائق من السحابة لعائلة (المالك بس — سياسة الحذف). قبل حذف العائلة أو الحساب */
export async function wipeFamilyFiles(sb: SupabaseClient, familyId: string) {
  for (let i = 0; i < 100; i++) {
    const { data, error } = await sb.storage.from("contracts").list(familyId, { limit: 100 });
    if (error) throw new Error("ما قدرنا نوصل لملفات السحابة: " + error.message);
    const paths = (data ?? []).filter((x) => x.id).map((x) => `${familyId}/${x.name}`);
    if (!paths.length) return;
    const { error: e } = await sb.storage.from("contracts").remove(paths);
    if (e) throw new Error("ما انحذفت ملفات السحابة: " + e.message);
  }
}

/** DW-038: حذف الحساب نهائياً (شرط المتاجر): ملفات العائلة لو مالك ← الحساب والعائلة والعضوية ← خروج */
export async function deleteAccount(sb: SupabaseClient, familyId: string | undefined, role: "owner" | "member" | undefined) {
  if (familyId && role === "owner") await wipeFamilyFiles(sb, familyId);
  await rpc<void>(sb, "delete_my_account", {});
  await sb.auth.signOut().catch(() => undefined);
}

/** العائلة اللي المستخدم عضو فيها (أول وحدة) */
export async function myFamily(sb: SupabaseClient): Promise<{ id: string; name: string; role: "owner" | "member"; canEdit: boolean } | null> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await sb.from("family_members").select("role, can_edit, families(id, name)").eq("user_id", u.user.id).limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0] as unknown as { role: "owner" | "member"; can_edit?: boolean; families: { id: string; name: string } } | undefined;
  return row ? { id: row.families.id, name: row.families.name, role: row.role, canEdit: row.role === "owner" || row.can_edit !== false } : null;
}

// ── DW-045: الدخول بقوقل/أبل، «نسيت كلمة السر»، والتحقق بخطوتين (TOTP) ─────────────
const APP_SCHEME = "bh.wadqa.idarati://auth"; // رابط الرجوع لتطبيق الجوال (مسجّل بـ Info.plist وAndroidManifest)
const native = () => (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true;
/** وين يرجع رابط الإيميل/الدخول: التطبيق نفسه بالجوال، أو نفس الصفحة بالمتصفح */
export const authReturnUrl = (extra = "") => (native() ? APP_SCHEME : location.origin + location.pathname) + extra;

/** دخول بقوقل أو أبل: بالمتصفح تحويل عادي، وبالجوال متصفح داخلي ويرجع للتطبيق برابط bh.wadqa.idarati:// */
export async function oauthSignIn(sb: SupabaseClient, provider: "google" | "apple") {
  if (!native()) {
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: authReturnUrl() } });
    if (error) throw error;
    return;
  }
  const { data, error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: APP_SCHEME, skipBrowserRedirect: true } });
  if (error || !data.url) throw error ?? new Error("ما قدرنا نفتح صفحة الدخول");
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url, presentationStyle: "popover" });
}

/** تطبيق الجوال: لما يرجع رابط الدخول أو الإيميل (bh.wadqa.idarati://auth?code=…) نبدّله بجلسة. يرجّع true لو كان استرجاع كلمة سر */
export async function handleAuthDeepLink(sb: SupabaseClient, link: string) {
  if (!link.startsWith(APP_SCHEME)) return false;
  const u = new URL(link.replace(APP_SCHEME, "https://app.local/auth"));
  const code = u.searchParams.get("code");
  try { const { Browser } = await import("@capacitor/browser"); await Browser.close(); } catch { /* مو مفتوح */ }
  if (!code) throw new Error(u.searchParams.get("error_description") ?? "رابط الدخول ناقص");
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return u.searchParams.get("recover") === "1";
}

/** «نسيت كلمة السر»: رابط بالإيميل يرجّعه لشاشة كلمة سر جديدة */
export async function sendPasswordReset(sb: SupabaseClient, email: string) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: authReturnUrl("?recover=1") });
  if (error) throw error;
}
export async function setNewPassword(sb: SupabaseClient, password: string) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

/** التحقق بخطوتين: الحالة الحالية. needCode = مفعّل والجلسة للحين بكلمة السر بس */
export async function mfaStatus(sb: SupabaseClient) {
  const [{ data: aal }, { data: f }] = await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(), sb.auth.mfa.listFactors()]);
  const verified = (f?.totp ?? []).filter((x) => x.status === "verified");
  return { enabled: verified.length > 0, factorId: verified[0]?.id, needCode: aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2" };
}
/** تفعيل: يرجّع QR (SVG) والمفتاح السري للنسخ اليدوي. ما يصير فعّال إلا بعد أول رمز صحيح */
export async function mfaEnroll(sb: SupabaseClient) {
  const { data: f } = await sb.auth.mfa.listFactors();
  for (const x of f?.all ?? []) if (x.status !== "verified") await sb.auth.mfa.unenroll({ factorId: x.id }); // محاولات قديمة ما اكتملت
  const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "إداراتي", issuer: "Idarati" });
  if (error) throw error;
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}
export async function mfaVerify(sb: SupabaseClient, factorId: string, code: string) {
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\D/g, "") });
  if (error) throw new Error(/invalid|expired/i.test(error.message) ? "الرمز غلط أو انتهى — اكتب الرمز اللي ظاهر الحين" : error.message);
}
export async function mfaDisable(sb: SupabaseClient, factorId: string) {
  const { error } = await sb.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
