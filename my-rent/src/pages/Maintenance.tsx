import { t } from "../i18n";
import { useStore } from "../data/store";
import { useStagger } from "../theme/motion";
import { DemoNote, SkeletonCards } from "../ui/kit";
import { Icon } from "../ui/icons";

/** المنزل والصيانة: مهام تتأشّر «تم» */
export function Maintenance() {
  const { data, loading, toggleTask } = useStore();
  const stagger = useStagger(loading);
  const open = data.tasks.filter((t) => !t.done);
  const done = data.tasks.filter((t) => t.done);
  return (
    <div className="stack-lg">
      <p className="muted" style={{ margin: 0 }}><span className="num">{open.length}</span> {t("مهام مفتوحة")}</p>
      {loading ? <SkeletonCards n={3} /> : (
        <ul className="rows rows-tap card-list">
          {[...open, ...done].map((t, i) => {
            const st = stagger(i);
            return (
              <li key={t.id} className={st.className} style={st.style}>
                <button className="row-btn press task" role="checkbox" aria-checked={t.done} onClick={() => toggleTask(t.id)}>
                  <span className="check">{t.done && Icon.check}</span>
                  <span style={{ flex: 1 }}><span className="strong task-title">{t.title}</span><br /><span className="muted small">{t.sub}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <DemoNote />
    </div>
  );
}
