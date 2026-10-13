import { useStore } from "../data/store";
import { arrears, balances, budget, collection, contractAlerts, monthName, unitStatus } from "../data/logic";
import type { Unit } from "../data/types";
import { Money, StatusPill } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { Bar, DemoNote, EmptyState, SectionHead, SkeletonCards } from "../ui/kit";
import { Icon } from "../ui/icons";

/** حلقة التحصيل: تنرسم لما تتغيّر النسبة (stroke-dashoffset) */
function Ring({ value, label }: { value: number; label: string }) {
  const r = 38, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" role="img" aria-label={`نسبة التحصيل ${label}`}>
      <svg viewBox="0 0 96 96" width="96" height="96">
        <circle cx="48" cy="48" r={r} className="ring-track" />
        <circle cx="48" cy="48" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <span className="num">{label}</span>
    </div>
  );
}

export function Home({ onOpenUnit, go }: { onOpenUnit: (u: Unit) => void; go: (id: string) => void }) {
  const { data, loading } = useStore();
  const stagger = useStagger(loading);
  const c = collection(data);
  const b = budget(data);
  const bank = balances(data);
  const attention = [...c.late, ...c.due];
  const contracts = contractAlerts(data);
  const pct = c.expected ? Math.round((c.collected / c.expected) * 100) : 0;

  return (
    <div className="stack-lg home-grid">
      <div className="hero-card area-hero">
        <div className="hero-top">
          <div>
            <div className="hero-label">تحصيل {monthName(c.month)}</div>
            <div className="hero-amount"><Money fils={c.collected} animate /></div>
            <div className="hero-sub">من <span className="num">{(c.expected / 1000).toLocaleString("en-US")}</span> د.ب · <span className="num">{c.paid.length}</span> من <span className="num">{c.paid.length + c.due.length + c.late.length}</span> وحدات</div>
          </div>
          <Ring value={c.expected ? c.collected / c.expected : 0} label={`${pct}%`} />
        </div>
        <div className="hero-stats">
          <button className="hero-stat press" onClick={() => go("tenants")}><b className="num">{c.late.length}</b><span>متأخر</span></button>
          <button className="hero-stat press" onClick={() => go("tenants")}><b className="num">{c.due.length}</b><span>مستحق</span></button>
          <div className="hero-stat"><b className="num">{c.vacant}</b><span>شاغر</span></div>
        </div>
        {c.owed > 0 && (
          <button className="hero-owed press" onClick={() => go("tenants")}>
            <span>متأخرات على المستأجرين</span>
            <Money fils={c.owed} />
          </button>
        )}
      </div>

      <section className="area-att">
        <SectionHead title="يحتاج انتباهك" action={<button className="link press" onClick={() => go("tenants")}>كل المستأجرين</button>} />
        {loading ? <SkeletonCards n={2} /> : attention.length === 0 ? (
          <EmptyState text="كل الإيجارات مدفوعة هالشهر." />
        ) : (
          <ul className="rows rows-tap card-list">
            {attention.map((u, i) => {
              const s = stagger(i);
              return (
                <li key={u.id} className={s.className} style={s.style}>
                  <button className="row-btn press" onClick={() => onOpenUnit(u)}>
                    <span><span className="strong">{u.name}</span> <span className="muted small">· {u.tenant?.name}</span></span>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}><Money fils={arrears(data, u).amount || u.rent} /><StatusPill status={unitStatus(data, u)} /></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {contracts.length > 0 && (
        <section className="area-con">
          <SectionHead title="عقود تنتهي قريب" />
          <ul className="rows rows-tap card-list">
            {contracts.map(({ unit: u, left }) => (
              <li key={u.id}>
                <button className="row-btn press" onClick={() => onOpenUnit(u)}>
                  <span><span className="strong">{u.name}</span> <span className="muted small">· {u.tenant?.name}</span></span>
                  <span className={`pill ${left < 0 ? "pill-late" : "pill-due"}`}>{left < 0 ? "انتهى" : left === 0 ? "اليوم" : <>بعد <span className="num">{left}</span> يوم</>}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid-2 area-tiles">
        <button className="card tappable press tile" onClick={() => go("budget")}>
          <span className="tile-icon">{Icon.budget}</span>
          <span className="muted small">مصروف الشهر</span>
          <Money fils={b.spent} />
          <Bar value={b.spent} max={b.limit} />
          <span className="muted small">من <span className="num">{(b.limit / 1000).toLocaleString("en-US")}</span> د.ب</span>
        </button>
        <button className="card tappable press tile" onClick={() => go("bank")}>
          <span className="tile-icon">{Icon.bank}</span>
          <span className="muted small">رصيد بنك العائلة</span>
          <Money fils={bank.total} />
          <span className="muted small"><span className="num">{bank.members.length}</span> أعضاء</span>
        </button>
      </div>
      <DemoNote />
    </div>
  );
}
