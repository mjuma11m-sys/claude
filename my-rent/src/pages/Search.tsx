import { useEffect, useRef, useState } from "react";
import type { Unit } from "../data/types";
import { useStore } from "../data/store";
import { unitStatus } from "../data/logic";
import { normalize } from "../data/prefs";
import { StatusPill } from "../theme/AppShell";
import { Sheet } from "../ui/kit";
import { Icon } from "../ui/icons";

/** بحث بالاسم أو الوحدة أو المبنى أو الهاتف — يقبل الأرقام العربية */
export function SearchSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (u: Unit) => void }) {
  const { data } = useStore();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); window.setTimeout(() => input.current?.focus(), 60); } }, [open]);

  const n = normalize(q);
  const hits = !n ? [] : data.units.filter((u) =>
    [u.name, u.building, u.tenant?.name ?? "", u.tenant?.phone ?? ""].some((f) => normalize(f).includes(n)));

  return (
    <Sheet open={open} onClose={onClose} title="بحث">
      <div className="search-box">
        {Icon.search}
        <input ref={input} id="search-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم، شقة، مبنى، أو رقم" autoComplete="off" />
      </div>
      {n && hits.length === 0 && <p className="muted" style={{ textAlign: "center" }}>ما لقيت «{q}».</p>}
      {hits.length > 0 && (
        <ul className="rows rows-tap card-list" style={{ marginTop: 12 }}>
          {hits.map((u) => (
            <li key={u.id}>
              <button className="row-btn press" onClick={() => onPick(u)}>
                <span><span className="strong">{u.name}</span> <span className="muted small">· {u.tenant?.name ?? "شاغرة"} · {u.building}</span></span>
                {u.tenant ? <StatusPill status={unitStatus(data, u)} /> : <span className="pill pill-vacant">شاغر</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
