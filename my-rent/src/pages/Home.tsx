import { useState } from "react";
import { useStore } from "../data/store";
import { arrears, chequesDue, monthKey, rentAt, backupDue, balances, budget, collection, contractAlerts, docAlerts, fmt, monthName, unitStatus } from "../data/logic";
import { DocPill } from "./Docs";
import type { Unit } from "../data/types";
import { Money, StatusPill } from "../theme/AppShell";
import { useStagger } from "../theme/motion";
import { Bar, DemoNote, EmptyState, SectionHead, SkeletonCards, useToast } from "../ui/kit";
import { Icon } from "../ui/icons";
import { getLastBackup, setWelcomed, welcomed } from "../data/prefs";

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

export type QuickAction = "pay" | "expense" | "unit" | "search";

export function Home({ onOpenUnit, go, onQuick }: { onOpenUnit: (u: Unit) => void; go: (id: string) => void; onQuick: (a: QuickAction) => void }) {
  const { data, loading, quickPay, unpay, eraseAll, sync } = useStore();
  const [welcome, setWelcome] = useState(() => !welcomed()); // DW-031
  const toast = useToast();
  const received = (u: Unit) => {
    const p = quickPay(u.id);
    if (p) toast({ text: `استلمت ${u.name} · ${monthName(p.month)} · ${fmt(p.amount)} د.ب`, undo: () => unpay(p.id), stamp: true });
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
          <h2 className="set-title" id="wl-h">أهلاً بإداراتي 👋</h2>
          <p className="small" style={{ margin: 0 }}>اللي تشوفه الحين <b>بيانات تجريبية</b> عشان تتعرّف على التطبيق. لما تكون جاهز، ابدأ ببياناتك: التطبيق يفضى وتضيف أول وحدة.</p>
          <div className="grid-2">
            <button className="btn press" id="welcome-start" onClick={() => { setWelcomed(); setWelcome(false); eraseAll(); onQuick("unit"); }}>ابدأ ببياناتي</button>
            <button className="btn btn-ghost press" id="welcome-demo" onClick={() => { setWelcomed(); setWelcome(false); }}>خلّني أجرب أول</button>
          </div>
          <p className="muted small" style={{ margin: 0 }}>قيد التطوير · نسخة تجريبية. بدون حساب كل شي على جوالك بس.</p>
        </section>
      )}
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

      <div className="quick area-quick" role="toolbar" aria-label="أوامر سريعة">
        <button className="quick-btn press" onClick={() => onQuick("pay")}><span className="quick-ic">{Icon.check}</span>دفعة</button>
        <button className="quick-btn press" onClick={() => onQuick("expense")}><span className="quick-ic">{Icon.budget}</span>مصروف</button>
        <button className="quick-btn press" onClick={() => onQuick("unit")}><span className="quick-ic">{Icon.tenants}</span>وحدة</button>
        <button className="quick-btn press" onClick={() => onQuick("search")}><span className="quick-ic">{Icon.search}</span>بحث</button>
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
                <li key={u.id} className={`att-row ${s.className}`} style={s.style}>
                  <button className="row-btn press" onClick={() => onOpenUnit(u)}>
                    <span><span className="strong">{u.name}</span> <span className="muted small">· {u.tenant?.name}</span></span>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}><Money fils={arrears(data, u).amount || rentAt(u, monthKey(new Date()))} /><StatusPill status={unitStatus(data, u)} /></span>
                  </button>
                  <button className="got-btn press" onClick={() => received(u)} aria-label={`استلمت إيجار ${u.name}`}>{Icon.check}<span>استلمت</span></button>
                </li>
              );
            })}
          </ul>
        )}
        {nudge && (
          <div className="nudge" role="status">
            <span>{last ? <>آخر نسخة احتياطية <span className="num">{last}</span></> : "ما فيه نسخة احتياطية للبيانات"} · البيانات على هالجهاز بس</span>
            <span className="nudge-acts">
              <button className="link press" onClick={() => go("settings")}>خذ نسخة</button>
              <button className="icon-x press" onClick={() => setNudge(false)} aria-label="بعدين">×</button>
            </span>
          </div>
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

      {chq.length > 0 && (
        <section className="area-docs" id="home-cheques">
          <SectionHead title="شيكات تستحق الإيداع" />
          <ul className="rows rows-tap card-list">
            {chq.map(({ cheque: c, left }) => { const u = data.units.find((x) => x.id === c.unitId); return (
              <li key={c.id}>
                <button className="row-btn press" onClick={() => u && onOpenUnit(u)}>
                  <span><span className="strong">{u?.name}</span> <span className="muted small">· شيك <span className="num">{c.number}</span> · <span className="num">{fmt(c.amount)}</span> د.ب</span></span>
                  <span className={`pill ${left < 0 ? "pill-late" : "pill-due"}`}>{left < 0 ? <>متأخر <span className="num">{-left}</span> يوم</> : left === 0 ? "اليوم" : <>بعد <span className="num">{left}</span> يوم</>}</span>
                </button>
              </li>
            ); })}
          </ul>
        </section>
      )}

      {docs.length > 0 && (
        <section className="area-docs" id="home-docs">
          <SectionHead title="وثائق تحتاج تجديد" action={<button className="link press" onClick={() => go("docs")}>كل الوثائق</button>} />
          <ul className="rows rows-tap card-list">
            {docs.map(({ doc, state, left }) => (
              <li key={doc.id}>
                <button className="row-btn press" onClick={() => go("docs")}>
                  <span className="strong">{doc.title}</span>
                  <DocPill state={state} left={left} />
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
    </>
  );
}
