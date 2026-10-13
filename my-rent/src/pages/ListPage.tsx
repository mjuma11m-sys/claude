import type { ListItem } from "../data/types";
import { useStore } from "../data/store";
import { Money } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { DemoNote, SkeletonCards } from "../ui/kit";

/** المحفظة، السفر، المنزل، الموردين: نفس الشكل، بيانات مختلفة */
export function ListPage({ items, total }: { items: ListItem[]; total?: string }) {
  const { loading } = useStore();
  const stagger = useStagger(loading);
  const sum = items.reduce((s, i) => s + (i.value ?? 0), 0);
  return (
    <div className="stack-lg">
      {total && (
        <div className="card summary"><div><div className="muted small">{total}</div><div className="big"><Money fils={sum} animate /></div></div></div>
      )}
      {loading ? <SkeletonCards n={3} /> : (
        <div className="grid-cards">
          {items.map((it, i) => {
            const st = stagger(i);
            return (
              <div key={it.id} className={`card ${st.className}`} style={st.style}>
                <div className="unit-top"><span className="strong">{it.title}</span>{it.tag && <span className={`pill pill-${it.tag.tone}`}>{it.tag.label}</span>}</div>
                <div className="muted small">{it.sub}</div>
                {it.value !== undefined && <div style={{ marginTop: 8 }}><Money fils={it.value} /></div>}
              </div>
            );
          })}
        </div>
      )}
      <DemoNote />
    </div>
  );
}
