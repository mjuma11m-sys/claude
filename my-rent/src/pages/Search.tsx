import { t } from "../i18n";
import { useEffect, useRef, useState } from "react";
import type { Unit } from "../data/types";
import { useStore } from "../data/store";
import { unitStatus } from "../data/logic";
import { normalize } from "../data/prefs";
import { StatusPill } from "../theme/AppShell";
import { Sheet } from "../ui/kit";
import { Icon } from "../ui/icons";

/** بحث بالاسم أو الوحدة أو المبنى أو الهاتف — يقبل الأرقام العربية */
export function SearchSheet({ open, onClose, onPick, go }: { open: boolean; onClose: () => void; onPick: (u: Unit) => void; go: (page: string) => void }) {
  const { data } = useStore();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); window.setTimeout(() => input.current?.focus(), 60); } }, [open]);

  const n = normalize(q);
  const hits = !n ? [] : data.units.filter((u) =>
    [u.name, u.building, u.tenant?.name ?? "", u.tenant?.phone ?? "", u.notes ?? "", u.meters?.elec ?? "", u.meters?.water ?? ""].some((f) => normalize(f).includes(n)));
  // DW-029: الوثائق والموردين كمان
  const docHits = !n ? [] : (data.docs ?? []).filter((d) => [d.title, d.ref ?? ""].some((f) => normalize(f).includes(n)));
  const vendorHits = !n ? [] : data.vendors.filter((v) => [v.name, v.service, v.phone].some((f) => normalize(f).includes(n)));
  const none = hits.length + docHits.length + vendorHits.length === 0;

  return (
    <Sheet open={open} onClose={onClose} title={t("بحث")}>
      <div className="search-box">
        {Icon.search}
        <input ref={input} id="search-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("اسم، شقة، وثيقة، مورّد، أو رقم")} autoComplete="off" />
      </div>
      {n && none && <p className="muted" style={{ textAlign: "center" }}>{t("ما لقيت «")}{q}».</p>}
      {hits.length > 0 && (
        <ul className="rows rows-tap card-list" style={{ marginTop: 12 }}>
          {hits.map((u) => (
            <li key={u.id}>
              <button className="row-btn press" onClick={() => onPick(u)}>
                <span><span className="strong">{u.name}</span> <span className="muted small">· {u.tenant?.name ?? t("شاغرة")} · {u.building}</span></span>
                {u.tenant ? <StatusPill status={unitStatus(data, u)} /> : <span className="pill pill-vacant">{t("شاغر")}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {docHits.length > 0 && (
        <ul className="rows rows-tap card-list" style={{ marginTop: 12 }} id="search-docs">
          {docHits.map((d) => (
            <li key={d.id}><button className="row-btn press" onClick={() => { onClose(); go("docs"); }}><span><span className="strong">{d.title}</span> <span className="muted small">{t("· وثيقة")}{d.expires ? <> · <span className="num">{d.expires}</span></> : ""}</span></span></button></li>
          ))}
        </ul>
      )}
      {vendorHits.length > 0 && (
        <ul className="rows rows-tap card-list" style={{ marginTop: 12 }} id="search-vendors">
          {vendorHits.map((v) => (
            <li key={v.id}><button className="row-btn press" onClick={() => { onClose(); go("vendors"); }}><span><span className="strong">{v.name}</span> <span className="muted small">· {v.service} · <span className="num">{v.phone}</span></span></span></button></li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
