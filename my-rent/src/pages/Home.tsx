import { useState } from "react";
import { useStore } from "../data/store";
import { remindList, arrears, chequesDue, monthKey, rentAt, backupDue, balances, budget, collection, contractAlerts, docAlerts, fmt, monthName, unitStatus } from "../data/logic";
import { DocPill } from "./Docs";
import { FEEDBACK_TO } from "./Feedback";
import { RemindSheet } from "./Remind";
import type { Unit } from "../data/types";
import { Money, StatusPill } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { Bar, DemoNote, EmptyState, SectionHead, SkeletonCards, useToast } from "../ui/kit";
import { Icon } from "../ui/icons";
import { getLastBackup, priceAskDue, setPriceAsked, setSetup, setStarted, setWelcomed, setupOpen, welcomed } from "../data/prefs";
import { t } from "../i18n";

/** حلقة التحصيل: تنرسم لما تتغيّر النسبة (stroke-dashoffset) */
function Ring({ value, label }: { value: number; label: string }) {
  const r = 38, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" role="img" aria-label={t("نسبة التحصيل {p}", { p: label })}>
      <svg viewBox="0 0 96 96" width="96" height="96">
        <circle cx="48" cy="48" r={r} className="ring-track" />
        <circle cx="48" cy="48" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <span className="num">{label}</span>
    </div>
  );
}

export type QuickAction = "pay" | "expense" | "unit" | "search";

export function Home({ onOpenUnit, go, onQuick }: { onOpenUnit: (u: Unit) => void; go: (id: string) => void; onQuick: (a: QuickAction) => void }) {
  const { data, loading, quickPay, unpay, eraseAll, sync } = useStore();
  const [welcome, setWelcome] = useState(() => !welcomed()); // DW-031
  const [setup, setSetupShown] = useState(setupOpen); // DW-035
  const [priceAsk, setPriceAsk] = useState(priceAskDue); // DW-051: بعد أسبوع من «ابدأ ببياناتي»، مرة وحدة
  const [reminding, setReminding] = useState(false); // DW-043
  const toast = useToast();
  const received = (u: Unit) => {
    const p = quickPay(u.id);
    if (p) toast({ text: t("استلمت {unit} · {month} · {amount} د.ب", { unit: u.name, month: monthName(p.month), amount: fmt(p.amount) }), undo: () => unpay(p.id), stamp: true });
  };
  const stagger = useStagger(loading);
  const [nudge, setNudge] = useState(() => data.units.length > 0 && backupDue(getLastBackup()));
  const last = getLastBackup();
  const c = collection(data);
  const b = budget(data);
  const bank = balances(data);
  const attention = [...c.late, ...c.due];
  const contracts = contractAlerts(data);
  const docs = docAlerts(data);
  const chq = chequesDue(data);
  const pct = c.expected ? Math.round((c.collected / c.expected) * 100) : 0;

  return (
    <>
      {welcome && !sync && (
        <section className="card stack welcome-card" id="welcome" aria-labelledby="wl-h">
          <h2 className="set-title" id="wl-h">{t("أهلاً بإداراتي 👋")}</h2>
          <p className="small" style={{ margin: 0 }}>{t("اللي تشوفه الحين")} <b>{t("بيانات تجريبية")}</b> {t("عشان تتعرّف على التطبيق. لما تكون جاهز، ابدأ ببياناتك: التطبيق يفضى وتضيف أول وحدة.")}</p>
          <div className="grid-2">
            <button className="btn press" id="welcome-start" onClick={() => { setWelcomed(); setWelcome(false); setSetup("open"); setSetupShown(true); setStarted(new Date().toISOString().slice(0, 10)); eraseAll(); onQuick("unit"); }}>{t("ابدأ ببياناتي")}</button>
            <button className="btn btn-ghost press" id="welcome-demo" onClick={() => { setWelcomed(); setWelcome(false); }}>{t("خلّني أجرب أول")}</button>
          </div>
          <p className="muted small" style={{ margin: 0 }}>{t("قيد التطوير · نسخة تجريبية. بدون حساب كل شي على جوالك بس.")}</p>
        </section>
      )}
      {priceAsk && !welcome && (
        <section className="card stack" id="price-ask" aria-labelledby="price-h">
          <h2 className="set-title" id="price-h" style={{ margin: 0 }}>{t("سؤال واحد بس 🙏")}</h2>
          <p style={{ margin: 0 }}>{t("لو المزامنة ومشاركة العائلة صارت اشتراك بـ 1.500 د.ب بالشهر، تدفع؟")}</p>
          <p className="muted small" style={{ margin: 0 }}>{t("هذا سؤال بس، مو اشتراك — التطبيق على الجوال يظل مجاني. جوابك يروح بالواتساب.")}</p>
          <div className="grid-3">
            {([["yes", t("إيه")], ["maybe", t("يمكن")], ["no", t("لا")]] as const).map(([k, l]) => (
              <a key={k} className="btn btn-ghost press" id={`price-${k}`} href={`https://wa.me/${FEEDBACK_TO}?text=${encodeURIComponent(t("سؤال السعر (إداراتي): 1.500 د.ب بالشهر للمزامنة؟ جوابي: {a}", { a: l }))}`} target="_blank" rel="noreferrer" onClick={() => { setPriceAsked(); setPriceAsk(false); }}>{l}</a>
            ))}
          </div>
          <button className="link press" id="price-skip" style={{ justifySelf: "start" }} onClick={() => { setPriceAsked(); setPriceAsk(false); }}>{t("ما أبي أجاوب")}</button>
        </section>
      )}
      {setup && !welcome && (() => {
        const steps = [
          { id: "unit", label: t("أضف أول وحدة"), done: data.units.length > 0, act: () => onQuick("unit") },
          { id: "pay", label: t("سجّل أول دفعة"), done: data.payments.length > 0, act: () => go("tenants") },
          { id: "contract", label: t("اعتمد أول عقد (أو استورد عقدك من الإعدادات)"), done: (data.contracts ?? []).length > 0, act: () => go("tenants") }, // DW-051
          { id: "sync", label: t("فعّل المزامنة (اختياري، للعائلة وجهاز ثاني)"), done: !!sync, act: () => go("settings") },
          { id: "backup", label: t("خذ نسخة احتياطية"), done: !!last, act: () => go("settings") },
        ];
        const n = steps.filter((x) => x.done).length;
        return (
          <section className="card stack setup-card" id="setup" aria-labelledby="setup-h">
            <div className="row-between"><h2 className="set-title" id="setup-h" style={{ margin: 0 }}>{t("جهّز إداراتي")}</h2><span className="num muted small">{t("{n} من {all}", { n, all: steps.length })}</span></div>
            <div className="setup-bar" role="progressbar" aria-label={t("تقدّم التجهيز")} aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={n}><span style={{ transform: `scaleX(${n / steps.length})` }} /></div>
            <ul className="setup-list">
              {steps.map((x) => (
                <li key={x.id}>
                  <button className={`setup-step press${x.done ? " done" : ""}`} id={`setup-${x.id}`} onClick={x.act} disabled={x.done}>
                    <span className="setup-dot" aria-hidden="true">{x.done ? Icon.check : null}</span>
                    <span>{x.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            {n === steps.length
              ? <button className="btn press" id="setup-done" onClick={() => { setSetup("done"); setSetupShown(false); }}>{t("كل شي جاهز، سكّر القائمة")}</button>
              : <button className="link press" id="setup-hide" style={{ justifySelf: "start" }} onClick={() => { setSetup("done"); setSetupShown(false); }}>{t("إخفاء القائمة")}</button>}
          </section>
        );
      })()}
    <div className="stack-lg home-grid">
      <div className="hero-card area-hero">
        <div className="hero-top">
          <div>
            <div className="hero-label">{t("تحصيل {month}", { month: monthName(c.month) })}</div>
            <div className="hero-amount"><Money fils={c.collected} animate /></div>
            <div className="hero-sub">{t("من")} <span className="num">{(c.expected / 1000).toLocaleString("en-US")}</span> {t("د.ب ·")} <span className="num">{c.paid.length}</span> {t("من")} <span className="num">{c.paid.length + c.due.length + c.late.length}</span> {t("وحدات")}</div>
          </div>
          <Ring value={c.expected ? c.collected / c.expected : 0} label={`${pct}%`} />
        </div>
        <div className="hero-stats">
          <button className="hero-stat press" onClick={() => go("tenants")}><b className="num">{c.late.length}</b><span>{t("متأخر")}</span></button>
          <button className="hero-stat press" onClick={() => go("tenants")}><b className="num">{c.due.length}</b><span>{t("مستحق")}</span></button>
          <div className="hero-stat"><b className="num">{c.vacant}</b><span>{t("شاغر")}</span></div>
        </div>
        {c.owed > 0 && (
          <button className="hero-owed press" onClick={() => go("tenants")}>
            <span>{t("متأخرات على المستأجرين")}</span>
            <Money fils={c.owed} />
          </button>
        )}
      </div>

      <div className="quick area-quick" role="toolbar" aria-label={t("أوامر سريعة")}>
        <button className="quick-btn press" onClick={() => onQuick("pay")}><span className="quick-ic">{Icon.check}</span>{t("دفعة")}</button>
        <button className="quick-btn press" onClick={() => onQuick("expense")}><span className="quick-ic">{Icon.budget}</span>{t("مصروف")}</button>
        <button className="quick-btn press" onClick={() => onQuick("unit")}><span className="quick-ic">{Icon.tenants}</span>{t("وحدة")}</button>
        <button className="quick-btn press" onClick={() => onQuick("search")}><span className="quick-ic">{Icon.search}</span>{t("بحث")}</button>
      </div>

      <section className="area-att">
        <SectionHead title={t("يحتاج انتباهك")} action={<button className="link press" onClick={() => go("tenants")}>{t("كل المستأجرين")}</button>} />
        {loading ? <SkeletonCards n={2} /> : attention.length === 0 ? (
          <EmptyState text={t("كل الإيجارات مدفوعة هالشهر.")} />
        ) : (
          <ul className="rows rows-tap card-list">
            {attention.map((u, i) => {
              const s = stagger(i);
              return (
                <li key={u.id} className={`att-row ${s.className}`} style={s.style}>
                  <button className="row-btn press" onClick={() => onOpenUnit(u)}>
                    <span><span className="strong">{u.name}</span> <span className="muted small">· {u.tenant?.name}</span></span>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}><Money fils={arrears(data, u).amount || rentAt(u, monthKey(new Date()))} /><StatusPill status={unitStatus(data, u)} /></span>
                  </button>
                  <button className="got-btn press" onClick={() => received(u)} aria-label={t("استلمت إيجار {unit}", { unit: u.name })}>{Icon.check}<span>{t("استلمت")}</span></button>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && remindList(data).length > 0 && (
          <button className="btn btn-wa press remind-open" id="remind-open" onClick={() => setReminding(true)}>{t("ذكّر المتأخرين بالواتساب ({n})", { n: remindList(data).length })}</button>
        )}
        <RemindSheet open={reminding} onClose={() => setReminding(false)} />
        {nudge && (
          <div className="nudge" role="status">
            <span>{last ? <>{t("آخر نسخة احتياطية")} <span className="num">{last}</span></> : t("ما فيه نسخة احتياطية للبيانات")} · {t("البيانات على هالجهاز بس")}</span>
            <span className="nudge-acts">
              <button className="link press" onClick={() => go("settings")}>{t("خذ نسخة")}</button>
              <button className="icon-x press" onClick={() => setNudge(false)} aria-label={t("بعدين")}>×</button>
            </span>
          </div>
        )}
      </section>

      {(contracts.length > 0 || chq.length > 0 || docs.length > 0) && (
        <section className="area-con follow" id="home-follow" aria-labelledby="follow-h">
          <SectionHead title={t("يحتاج متابعة")} />
          {chq.length > 0 && (
            <div className="follow-group" id="home-cheques">
              <h3 className="follow-h">{t("شيكات تستحق الإيداع")} <span className="num muted">{chq.length}</span></h3>
              <ul className="rows rows-tap card-list">
                {chq.slice(0, 3).map(({ cheque: c, left }) => { const u = data.units.find((x) => x.id === c.unitId); return (
                  <li key={c.id}>
                    <button className="row-btn press" onClick={() => u && onOpenUnit(u)}>
                      <span><span className="strong">{u?.name}</span> <span className="muted small">{t("· شيك")} <span className="num">{c.number}</span> · <span className="num">{fmt(c.amount)}</span> {t("د.ب")}</span></span>
                      <span className={`pill ${left < 0 ? "pill-late" : "pill-due"}`}>{left < 0 ? <>{t("متأخر")} <span className="num">{-left}</span> {t("يوم")}</> : left === 0 ? t("اليوم") : <>{t("بعد")} <span className="num">{left}</span> {t("يوم")}</>}</span>
                    </button>
                  </li>
                ); })}
              </ul>
              {chq.length > 3 && <p className="muted small follow-more">+<span className="num">{chq.length - 3}</span> {t("شيكات ثانية")}</p>}
            </div>
          )}
          {contracts.length > 0 && (
            <div className="follow-group" id="home-contracts">
              <h3 className="follow-h">{t("عقود تنتهي قريب")} <span className="num muted">{contracts.length}</span></h3>
              <ul className="rows rows-tap card-list">
                {contracts.slice(0, 3).map(({ unit: u, left }) => (
                  <li key={u.id}>
                    <button className="row-btn press" onClick={() => onOpenUnit(u)}>
                      <span><span className="strong">{u.name}</span> <span className="muted small">· {u.tenant?.name}</span></span>
                      <span className={`pill ${left < 0 ? "pill-late" : "pill-due"}`}>{left < 0 ? t("انتهى") : left === 0 ? t("اليوم") : <>{t("بعد")} <span className="num">{left}</span> {t("يوم")}</>}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {contracts.length > 3 && <p className="muted small follow-more">+<span className="num">{contracts.length - 3}</span> {t("عقود ثانية")}</p>}
            </div>
          )}
          {docs.length > 0 && (
            <div className="follow-group" id="home-docs">
              <h3 className="follow-h">{t("وثائق تحتاج تجديد")} <span className="num muted">{docs.length}</span></h3>
              <ul className="rows rows-tap card-list">
                {docs.slice(0, 3).map(({ doc, state, left }) => (
                  <li key={doc.id}>
                    <button className="row-btn press" onClick={() => go("docs")}>
                      <span className="strong">{doc.title}</span>
                      <DocPill state={state} left={left} />
                    </button>
                  </li>
                ))}
              </ul>
              <button className="link press follow-more" onClick={() => go("docs")}>{t("كل الوثائق")}</button>
            </div>
          )}
        </section>
      )}

      <div className="grid-2 area-tiles">
        <button className="card tappable press tile" onClick={() => go("budget")}>
          <span className="tile-icon">{Icon.budget}</span>
          <span className="muted small">{t("مصروف الشهر")}</span>
          <Money fils={b.spent} />
          <Bar value={b.spent} max={b.limit} />
          <span className="muted small">{t("من")} <span className="num">{(b.limit / 1000).toLocaleString("en-US")}</span> {t("د.ب")}</span>
        </button>
        <button className="card tappable press tile" onClick={() => go("bank")}>
          <span className="tile-icon">{Icon.bank}</span>
          <span className="muted small">{t("رصيد بنك العائلة")}</span>
          <Money fils={bank.total} />
          <span className="muted small"><span className="num">{bank.members.length}</span> {t("أعضاء")}</span>
        </button>
      </div>
      <DemoNote />
    </div>
    </>
  );
}
