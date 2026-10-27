import { useState } from "react";
import { useStore } from "../data/store";
import { fmt, monthKey, monthName, remindList, reminderUrl } from "../data/logic";
import { Sheet } from "../ui/kit";
import { t } from "../i18n";

/** DW-043: كل المتأخرين بشاشة وحدة. ما فيه إرسال جماعي (واتساب يقفل الرقم): كل واحد زره يفتح محادثته،
 *  والمالك يضغط إرسال بنفسه. «أُرسل» تنحفظ بالجهاز لكل شهر عشان ما يكرر */
const KEY = (m: string) => `idarati-reminded:${m}`;
const readSent = (m: string): string[] => { try { return JSON.parse(localStorage.getItem(KEY(m)) ?? "[]"); } catch { return []; } };
const writeSent = (m: string, ids: string[]) => { try { localStorage.setItem(KEY(m), JSON.stringify(ids)); } catch { /* ignore */ } };

export function RemindSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useStore();
  const month = monthKey(new Date());
  const [sent, setSent] = useState(() => readSent(month));
  const list = remindList(data);
  const mark = (id: string) => { const next = [...new Set([...sent, id])]; setSent(next); writeSent(month, next); };
  const total = list.reduce((s, x) => s + x.amount, 0);
  return (
    <Sheet open={open} onClose={onClose} title={t("ذكّر المتأخرين")}>
      <div className="stack" id="remind">
        {list.length === 0 ? <p className="muted">{t("ما فيه أحد متأخر. 👌")}</p> : <>
          <p className="muted small" style={{ margin: 0 }}>{t("{n} متأخرين · المجموع", { n: list.length })} <span className="num">{fmt(total)}</span> {t("د.ب. كل زر يفتح محادثة المستأجر برسالة جاهزة، وأنت تضغط إرسال.")}</p>
          <ul className="rows remind-list">
            {list.map(({ unit, months, amount }) => {
              const done = sent.includes(unit.id);
              return (
                <li key={unit.id} className="remind-row" data-sent={done || undefined}>
                  <span className="remind-who">
                    <span className="strong">{unit.name}</span> <span className="muted small">· {unit.tenant?.name}{unit.tenant?.lang === "en" ? " · EN" : ""}</span>
                    <span className="muted small remind-months">{months.map(monthName).join(t("، "))} · <span className="num">{fmt(amount)}</span> {t("د.ب")}</span>
                  </span>
                  <a className={`btn ${done ? "btn-ghost" : "btn-wa"} press`} id={`remind-${unit.id}`} href={reminderUrl(unit, months, amount)} target="_blank" rel="noreferrer" onClick={() => mark(unit.id)}>
                    {done ? t("أُرسل ✓") : t("ذكّره")}
                  </a>
                </li>
              );
            })}
          </ul>
        </>}
      </div>
    </Sheet>
  );
}
