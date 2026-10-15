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
  : /owner only/.test(m) ? "المالك بس يقدر يحذف العائلة"
  : /not signed in/.test(m) ? "سجّل دخول أول"
  : m;

async function rpc<T>(sb: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(rpcError(error.message));
  return data as T;
}

export const createFamily = (sb: SupabaseClient, name: string) => rpc<string>(sb, "create_family", { family_name: name });
export const createInvite = (sb: SupabaseClient, familyId: string) => rpc<string>(sb, "create_invite", { f: familyId });
export const joinFamily = (sb: SupabaseClient, code: string) => rpc<string>(sb, "join_family", { invite_code: code });
export const deleteFamily = (sb: SupabaseClient, familyId: string) => rpc<void>(sb, "delete_family", { f: familyId });
export const leaveFamily = (sb: SupabaseClient, familyId: string) => rpc<void>(sb, "leave_family", { f: familyId });

/** العائلة اللي المستخدم عضو فيها (أول وحدة) */
export async function myFamily(sb: SupabaseClient): Promise<{ id: string; name: string; role: "owner" | "member" } | null> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await sb.from("family_members").select("role, families(id, name)").eq("user_id", u.user.id).limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0] as unknown as { role: "owner" | "member"; families: { id: string; name: string } } | undefined;
  return row ? { id: row.families.id, name: row.families.name, role: row.role } : null;
}
