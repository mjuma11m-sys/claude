import { useEffect, useState } from "react";
import { useStore } from "../data/store";
import { loadSyncConfig } from "../data/sync";
import { describeAction } from "../data/logic";
import type { ActivityRow, Member } from "../data/supabase";
import { useToast } from "../ui/kit";

const client = async () => { const c = loadSyncConfig()!; const m = await import("../data/supabase"); return { m, sb: await m.getClient(c.url, c.key) }; };
const when = (iso: string) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

/** DW-030: اسمي + أعضاء العائلة وصلاحياتهم (المالك يغيّرها) + سجل النشاط */
export function FamilyMembers() {
  const { data, sync, setAccess } = useStore();
  const toast = useToast();
  const s = sync!;
  const [me, setMe] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [name, setName] = useState("");
  const [log, setLog] = useState<ActivityRow[] | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { m, sb } = await client();
      const r = await m.listMembers(sb, s.familyId);
      setMe(r.me); setMembers(r.members);
      const mine = r.members.find((x) => x.user_id === r.me);
      if (mine) { setName(mine.display_name ?? ""); setAccess(mine.role === "owner" || mine.can_edit); }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  useEffect(() => { void load(); }, [s.familyId]);

  const label = (id: string) => { const x = members?.find((m) => m.user_id === id); return id === me ? "أنت" : x?.display_name || (x?.role === "owner" ? "المالك" : "عضو"); };

  return (
    <div className="stack family-box" id="family-box">
      <div className="sync-box stack">
        <label className="field"><span>اسمك داخل العائلة <span className="muted small">يشوفه أعضاء العائلة بس</span></span>
          <div className="bill-add"><input id="my-name" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="أبو جعفر" />
            <button type="button" className="btn btn-ghost press" onClick={async () => { try { const { m, sb } = await client(); await m.setMyName(sb, s.familyId, name); toast({ text: "انحفظ اسمك" }); void load(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } }}>احفظ</button></div>
        </label>
      </div>
      {members && members.length > 0 && (
        <ul className="rows card-list" id="members-list" aria-label="الأعضاء">
          {members.map((x) => (
            <li key={x.user_id} className="bill-row">
              <span>{x.user_id === me ? "أنت" : x.display_name || "عضو"} <span className="muted small">· {x.role === "owner" ? "المالك" : x.can_edit ? "يعدّل" : "مشاهدة بس"}</span></span>
              {s.role === "owner" && x.role !== "owner" && (
                <button type="button" className="link press" onClick={async () => {
                  try { const { m, sb } = await client(); await m.setMemberAccess(sb, s.familyId, x.user_id, !x.can_edit); toast({ text: x.can_edit ? "صار مشاهدة بس" : "صار يقدر يعدّل" }); void load(); }
                  catch (e) { setError(e instanceof Error ? e.message : String(e)); }
                }}>{x.can_edit ? "خلّه مشاهدة بس" : "خلّه يعدّل"}</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <details className="activity" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open && !log) void client().then(({ m, sb }) => m.recentEvents(sb, s.familyId)).then(setLog).catch((err) => setError(String(err?.message ?? err))); }}>
        <summary className="strong">سجل النشاط <span className="muted small">· مين سجّل شنو</span></summary>
        {!log ? <p className="muted small">يحمّل…</p> : log.length === 0 ? <p className="muted small">ما فيه نشاط للحين.</p> : (
          <ul className="rows card-list" id="activity-list">
            {log.map((r) => (
              <li key={r.id} className="bill-row"><span>{describeAction(r.action, data)}</span><span className="muted small">{label(r.user_id)} · <span className="num">{when(r.created_at)}</span></span></li>
            ))}
          </ul>
        )}
      </details>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}
