import { useState } from "react";
import { useStore } from "../data/store";
import { arrears, monthKey, monthName, monthTrail, rentAt, unitStatus } from "../data/logic";
import type { Status, Unit } from "../data/types";
import { Money, StatusPill } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { Chips, DemoNote, EmptyState, SkeletonCards } from "../ui/kit";
import { Tracker } from "./Tracker";
import { t } from "../i18n";

type Filter = "all" | Status | "vacant";

export function Tenants({ onOpenUnit, table = false, onView }: { onOpenUnit: (u: Unit) => void; table?: boolean; onView?: (table: boolean) => void }) {
  const { data, loading } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const stagger = useStagger(loading);
  const withStatus = data.units.map((u) => ({ u, s: u.tenant ? unitStatus(data, u) : null }));
  const count = (f: Filter) => withStatus.filter(({ u, s }) => (f === "all" ? true : f === "vacant" ? !u.tenant : s === f)).length;
  const order: Record<string, number> = { late: 0, due: 1, paid: 2 };
  const list = withStatus
    .filter(({ u, s }) => (filter === "all" ? true : filter === "vacant" ? !u.tenant : s === filter))
    .sort((a, b) => (order[a.s ?? ""] ?? 3) - (order[b.s ?? ""] ?? 3));

  const viewToggle = (
    <Chips<"cards" | "table"> label={t("العرض")} value={table ? "table" : "cards"} onChange={(v) => onView?.(v === "table")}
      options={[{ id: "cards", label: t("بطاقات") }, { id: "table", label: t("جدول المتابعة") }]} />
  );
  if (table) return <div className="stack-lg"><div className="view-toggle">{viewToggle}</div><Tracker onOpenUnit={onOpenUnit} /></div>;

  return (
    <div className="stack-lg">
      <div className="view-toggle">{viewToggle}</div>
      <Chips<Filter>
        label={t("تصفية")}
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: t("الكل"), count: count("all") },
          { id: "late", label: t("متأخر"), count: count("late") },
          { id: "due", label: t("مستحق"), count: count("due") },
          { id: "paid", label: t("مدفوع"), count: count("paid") },
          { id: "vacant", label: t("شاغر"), count: count("vacant") },
        ]}
      />
      {loading ? <SkeletonCards n={6} /> : list.length === 0 ? (
        <EmptyState text={t("ما فيه وحدات بهالتصفية.")} />
      ) : (
        <div className="grid-cards">
          {list.map(({ u, s }, i) => {
            const st = stagger(i);
            return (
              <button key={u.id} className={`card tappable press unit-card ${st.className}`} style={st.style} onClick={() => onOpenUnit(u)}>
                <div className="unit-top">
                  <span className="strong">{u.name} <span className="muted small">· {u.building}</span></span>
                  {s ? <StatusPill status={s} /> : <span className="pill pill-vacant">{t("شاغر")}</span>}
                </div>
                <div className="muted">{u.tenant?.name ?? t("بدون مستأجر")}</div>
                {s === "late" && (() => { const a = arrears(data, u); return <div className="owed-line">{t("متأخر:")} {a.months.map((m) => monthName(m.month)).join(t("، "))} · <Money fils={a.amount} /></div>; })()}
                {u.tenant && (
                  <div className="trail" aria-label={t("آخر 6 أشهر")}>
                    {monthTrail(data, u).map((m) => (
                      <i key={m.month} className={`dot dot-${m.state}`} title={`${monthName(m.month)}: ${{ paid: t("مدفوع"), late: t("متأخر"), due: t("مستحق"), none: t("قبل العقد") }[m.state]}`} />
                    ))}
                  </div>
                )}
                <div className="unit-foot"><Money fils={rentAt(u, monthKey(new Date()))} /><span className="muted small">{t("يستحق يوم")} <span className="num">{u.dueDay}</span></span></div>
              </button>
            );
          })}
        </div>
      )}
      <DemoNote />
    </div>
  );
}
