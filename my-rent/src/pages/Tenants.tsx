import { useState } from "react";
import { useStore } from "../data/store";
import { arrears, monthName, unitStatus } from "../data/logic";
import type { Status, Unit } from "../data/types";
import { Money, StatusPill } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { Chips, DemoNote, SkeletonCards } from "../ui/kit";

type Filter = "all" | Status | "vacant";

export function Tenants({ onOpenUnit }: { onOpenUnit: (u: Unit) => void }) {
  const { data, loading } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const stagger = useStagger(loading);
  const withStatus = data.units.map((u) => ({ u, s: u.tenant ? unitStatus(data, u) : null }));
  const count = (f: Filter) => withStatus.filter(({ u, s }) => (f === "all" ? true : f === "vacant" ? !u.tenant : s === f)).length;
  const order: Record<string, number> = { late: 0, due: 1, paid: 2 };
  const list = withStatus
    .filter(({ u, s }) => (filter === "all" ? true : filter === "vacant" ? !u.tenant : s === filter))
    .sort((a, b) => (order[a.s ?? ""] ?? 3) - (order[b.s ?? ""] ?? 3));

  return (
    <div className="stack-lg">
      <Chips<Filter>
        label="تصفية"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "الكل", count: count("all") },
          { id: "late", label: "متأخر", count: count("late") },
          { id: "due", label: "مستحق", count: count("due") },
          { id: "paid", label: "مدفوع", count: count("paid") },
          { id: "vacant", label: "شاغر", count: count("vacant") },
        ]}
      />
      {loading ? <SkeletonCards n={6} /> : list.length === 0 ? (
        <div className="card empty">ما فيه وحدات بهالتصفية.</div>
      ) : (
        <div className="grid-cards">
          {list.map(({ u, s }, i) => {
            const st = stagger(i);
            return (
              <button key={u.id} className={`card tappable press unit-card ${st.className}`} style={st.style} onClick={() => onOpenUnit(u)}>
                <div className="unit-top">
                  <span className="strong">{u.name} <span className="muted small">· {u.building}</span></span>
                  {s ? <StatusPill status={s} /> : <span className="pill pill-vacant">شاغر</span>}
                </div>
                <div className="muted">{u.tenant?.name ?? "بدون مستأجر"}</div>
                {s === "late" && (() => { const a = arrears(data, u); return <div className="owed-line">متأخر: {a.months.map((m) => monthName(m.month)).join("، ")} · <Money fils={a.amount} /></div>; })()}
                <div className="unit-foot"><Money fils={u.rent} /><span className="muted small">يستحق يوم <span className="num">{u.dueDay}</span></span></div>
              </button>
            );
          })}
        </div>
      )}
      <DemoNote />
    </div>
  );
}
