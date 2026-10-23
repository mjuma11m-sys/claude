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
