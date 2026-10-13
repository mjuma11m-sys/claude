import { useStore } from "../data/store";
import { balances } from "../data/logic";
import { Money } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { DemoNote, SectionHead, SkeletonCards } from "../ui/kit";

export function Bank() {
  const { data, loading } = useStore();
  const stagger = useStagger(loading);
  const b = balances(data);
  const name = (id: string) => data.members.find((m) => m.id === id)?.name ?? "";
  const txns = [...data.bank].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 10);
  return (
    <div className="stack-lg">
      <div className="hero-card">
        <div className="hero-label">رصيد بنك العائلة</div>
        <div className="hero-amount"><Money fils={b.total} animate /></div>
      </div>
      <section>
        <SectionHead title="الأعضاء" />
        {loading ? <SkeletonCards n={3} /> : (
          <div className="grid-cards">
            {b.members.map((m, i) => {
              const st = stagger(i);
              return (
                <div key={m.id} className={`card member ${st.className}`} style={st.style}>
                  <span className="avatar">{m.name.replace("ال", "").slice(0, 1)}</span>
                  <div><div className="strong">{m.name}</div><Money fils={m.balance} tone={m.balance < 0 ? "out" : undefined} /></div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <SectionHead title="آخر الحركات" />
        <ul className="rows card-list">
          {txns.map((t) => (
            <li key={t.id}><span>{t.label} <span className="muted small">· {name(t.memberId)} · <span className="num">{t.date}</span></span></span><Money fils={Math.abs(t.amount)} tone={t.amount < 0 ? "out" : "in"} /></li>
          ))}
        </ul>
      </section>
      <DemoNote />
    </div>
  );
}
