// إداراتي — هيكل التطبيق لكل الأجهزة (DW-008)
// جوال < 768px: شريط سفلي (4 أقسام + «المزيد») · تابلت 768–1199: شريط جانبي أيقونات · ديسكتوب ≥ 1200: شريط جانبي كامل
// بدون مكتبات إضافية: الأيقونات تنمرر كـ ReactNode (lucide-react أو SVG).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import "./tokens.css";
import "./AppShell.css";
import "./motion.css";
import symbolUrl from "../../brand/symbol.svg";
import { useCountUp, usePresence, usePulseOn, useReplayClass } from "./motion";

export type NavItem = { id: string; label: string; icon: ReactNode; badge?: number };

type Props = {
  items: NavItem[];          // بالترتيب: أول 4 تطلع بالشريط السفلي بالجوال، الباقي تحت «المزيد»
  active: string;
  onNavigate: (id: string) => void;
  title: ReactNode;
  actions?: ReactNode;       // أزرار الهيدر (بحث، إشعارات…)
  onAdd?: () => void;        // زر الإضافة الذهبي — واحد بس بالشاشة
  children: ReactNode;
};

const MOBILE_SLOTS = 4;

/** مؤشر التبويب المختار: ينزلق للتبويب الجديد (transform بس). أول قياس بدون حركة. */
function useIndicator(nav: RefObject<HTMLElement>, ind: RefObject<HTMLElement>, key: unknown) {
  const placed = useRef(false);
  useLayoutEffect(() => {
    const place = () => {
      const n = nav.current, i = ind.current;
      if (!n || !i) return;
      const a = n.querySelector<HTMLElement>('[aria-current="page"]');
      if (!a || a.offsetParent === null) { i.style.opacity = "0"; return; }
      i.style.transition = placed.current ? "" : "none";
      i.style.opacity = "1";
      i.style.width = `${a.offsetWidth}px`;
      i.style.height = `${a.offsetHeight}px`;
      i.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
      placed.current = true;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [nav, ind, key]);
}

export function AppShell({ items, active, onNavigate, title, actions, onAdd, children }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.slice(0, MOBILE_SLOTS);
  const overflow = items.slice(MOBILE_SLOTS);
  const overflowActive = overflow.some((i) => i.id === active);
  const sheet = usePresence(moreOpen);
  const mainRef = useReplayClass<HTMLElement>(active, "page-enter");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const sideNav = useRef<HTMLElement>(null), sideInd = useRef<HTMLSpanElement>(null);
  const botNav = useRef<HTMLElement>(null), botInd = useRef<HTMLSpanElement>(null);
  useIndicator(sideNav, sideInd, active);
  useIndicator(botNav, botInd, active + String(moreOpen));

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const go = (id: string) => {
    setMoreOpen(false);
    onNavigate(id);
  };

  return (
    <div className="shell" dir="rtl">
      <aside className="shell-side" aria-label="الأقسام">
        <div className="shell-logo">
          <img src={symbolUrl} alt="" width={32} height={32} />
          <span>إداراتي</span>
        </div>
        <nav ref={sideNav} className="side-nav">
          <span className="nav-ind side-ind" ref={sideInd} aria-hidden="true" />
          {items.map((i) => (
            <button
              key={i.id}
              className="side-item hoverable"
              aria-current={i.id === active ? "page" : undefined}
              onClick={() => go(i.id)}
              title={i.label}
            >
              {i.icon}
              <span className="side-label">{i.label}</span>
              {!!i.badge && <span className="badge num">{i.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="shell-header" data-scrolled={scrolled}>
          <h1>{title}</h1>
          <div className="shell-actions">{actions}</div>
        </header>
        <main className="shell-content" ref={mainRef}>{children}</main>
      </div>

      {onAdd && (
        <button className="fab" onClick={onAdd} aria-label="إضافة" data-hidden={moreOpen}>
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <nav className="shell-bottom" aria-label="الأقسام" ref={botNav}>
        <span className="nav-ind bottom-ind" ref={botInd} aria-hidden="true" />
        {primary.map((i) => (
          <button key={i.id} className="bottom-item" aria-current={i.id === active ? "page" : undefined} onClick={() => go(i.id)}>
            {i.icon}
            <span>{i.label}</span>
            {!!i.badge && <span className="badge num">{i.badge}</span>}
          </button>
        ))}
        {overflow.length > 0 && (
          <button className="bottom-item" aria-current={overflowActive ? "page" : undefined} aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="19" cy="12" r="2" fill="currentColor" />
            </svg>
            <span>المزيد</span>
          </button>
        )}
      </nav>

      {sheet && (
        <>
          <div className="sheet-backdrop" data-state={sheet} onClick={() => setMoreOpen(false)} />
          <div className="sheet" data-state={sheet} role="dialog" aria-modal="true" aria-label="باقي الأقسام">
            <div className="sheet-grip" />
            {overflow.map((i) => (
              <button key={i.id} className="sheet-item hoverable" aria-current={i.id === active ? "page" : undefined} onClick={() => go(i.id)}>
                {i.icon}
                <span>{i.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// شارة حالة موحدة: نفس الألوان بالمستأجرين والميزانية والبنك
export function StatusPill({ status }: { status: "paid" | "due" | "late" }) {
  const label = { paid: "مدفوع", due: "مستحق", late: "متأخر" }[status];
  const pulse = usePulseOn(status, "paid");
  return <span className={`pill pill-${status}${pulse ? " pill-pulse" : ""}`}>{label}</span>;
}

// مبلغ بالدينار: 3 خانات عشرية، LTR داخل نص عربي
// animate: يعد للرقم الجديد لما يتغيّر (دفعة جديدة / realtime)، مو عند كل فتح
export function Money({ fils, tone, animate }: { fils: number; tone?: "in" | "out"; animate?: boolean }) {
  const counted = useCountUp(fils);
  const v = ((animate ? counted : fils) / 1000).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return <span className={`num bhd money ${tone ? `money-${tone}` : ""}`}>{v}</span>;
}

