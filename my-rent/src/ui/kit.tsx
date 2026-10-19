// مكونات مشتركة بين الشاشات
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PointerEvent as RPE, type ReactNode } from "react";
import { usePresence, reducedMotion } from "../theme/motion";
import { Icon } from "./icons";
import symbolUrl from "../../brand/symbol.svg";

/* ---------- Sheet: نافذة من تحت بالجوال (تنسحب لتحت وتنسكّر)، ووسط الشاشة بالكمبيوتر ---------- */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const state = usePresence(open, 240);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; t0: number; dy: number; lastY: number; lastT: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const mobile = () => window.matchMedia("(max-width: 767px)").matches;
  const setY = (dy: number, animate: boolean) => {
    const el = panel.current; if (!el) return;
    el.style.transition = animate ? "transform 320ms var(--ease-drawer)" : "none";
    el.style.transform = dy ? `translateY(${dy}px)` : "";
    if (backdrop.current) backdrop.current.style.opacity = String(Math.max(0, 1 - dy / 500));
  };
  // يبدأ السحب من المقبض/العنوان، أو من أي مكان لو المحتوى بأعلاه — عشان ما يتعارض مع التمرير
  const onDown = (e: RPE) => {
    if (!mobile() || e.button > 0 || state !== "enter") return;
    const el = panel.current!;
    const fromHead = (e.target as HTMLElement).closest(".sheet-grip, .dlg-head");
    if (!fromHead && el.scrollTop > 0) return;
    if ((e.target as HTMLElement).closest("input, textarea, select, button, a") && !fromHead) return;
    drag.current = { y0: e.clientY, t0: e.timeStamp, dy: 0, lastY: e.clientY, lastT: e.timeStamp };
  };
  const onMove = (e: RPE) => {
    const d = drag.current; if (!d) return;
    const raw = e.clientY - d.y0;
    if (Math.abs(raw) < 6 && d.dy === 0) return;
    if (d.dy === 0) panel.current?.setPointerCapture(e.pointerId);
    d.dy = raw > 0 ? raw : raw / 6; // لفوق: مقاومة (rubber band)
    d.lastY = e.clientY; d.lastT = e.timeStamp;
    setY(d.dy, false);
  };
  const onUp = (e: RPE) => {
    const d = drag.current; drag.current = null; if (!d || d.dy === 0) return;
    const v = (e.clientY - d.lastY) / Math.max(1, e.timeStamp - d.lastT) || d.dy / Math.max(1, e.timeStamp - d.t0);
    if (d.dy > 140 || (d.dy > 40 && v > 0.5)) onClose(); // حركة الخروج تكمل من نفس المكان
    else setY(0, true);
  };

  useEffect(() => { if (state === "enter" && panel.current) setY(0, false); }, [state]);
  if (!state) return null;
  return (
    <>
      <div className="dlg-backdrop" data-state={state} onClick={onClose} ref={backdrop} />
      <div className="dlg" data-state={state} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="sheet-grip" />
        <div className="dlg-head">
          <h2>{title}</h2>
          <button className="icon-btn press" onClick={onClose} aria-label="إغلاق">{Icon.close}</button>
        </div>
        <div className="dlg-body">{children}</div>
      </div>
    </>
  );
}

/* ---------- Toast مع تراجع ---------- */
type ToastMsg = { id: number; text: string; undo?: () => void; stamp?: boolean };
const ToastCtx = createContext<(t: Omit<ToastMsg, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);
  const hide = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => { setToast(null); setLeaving(false); }, reducedMotion() ? 0 : 200);
  }, []);
  const [stamp, setStamp] = useState(0);
  const show = useCallback((t: Omit<ToastMsg, "id">) => {
    if (t.stamp) {
      // الختم: بس مع تسجيل الدفعة (DW-015)، ما يمنع اللمس، ويختفي بعد 700ms
      try { navigator.vibrate?.(12); } catch { /* iOS ما يدعم */ }
      if (!reducedMotion()) setStamp(Date.now());
    }
    window.clearTimeout(timer.current);
    setLeaving(false);
    setToast({ ...t, id: Date.now() });
    timer.current = window.setTimeout(hide, 5000);
  }, [hide]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {stamp > 0 && <Stamp key={stamp} onDone={() => setStamp(0)} />}
      <div className="toast-zone" aria-live="polite">
        {toast && (
          <div key={toast.id} className="toast" data-leaving={leaving}>
            <span className="toast-ok">{Icon.check}</span>
            <span>{toast.text}</span>
            {toast.undo && (
              <button className="toast-undo press" onClick={() => { toast.undo?.(); hide(); }}>تراجع</button>
            )}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

function Stamp({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = window.setTimeout(onDone, 760); return () => window.clearTimeout(t); }, [onDone]);
  return (
    <div className="stamp" aria-hidden="true">
      <img src={symbolUrl} alt="" />
      <span>مستلم</span>
    </div>
  );
}

/* ---------- عناصر صغيرة ---------- */
export function EmptyState({ text }: { text: string }) {
  return (
    <div className="card empty-state">
      <img src={symbolUrl} alt="" width={56} height={56} />
      <p>{text}</p>
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="chip press" onClick={() => onChange(o.id)}>
          {o.label}
          {o.count !== undefined && <span className="num chip-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** شريط تقدّم: يكبر من الصفر أول ما يظهر (scaleX)، ويحمر لو تعدّى 100% */
export function Bar({ value, max, tone, label = "نسبة المصروف من الميزانية" }: { value: number; max: number; tone?: "late" | "paid" | "brand"; label?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const over = value > max;
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((value / (max || 1)) * 100)}>
      <span className={`bar-fill bar-${over ? "late" : tone ?? "brand"}`} style={{ transform: `scaleX(${pct})` }} />
    </div>
  );
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="sec-head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function SkeletonCards({ n = 4 }: { n?: number }) {
  return (
    <div className="grid-cards" aria-busy="true" aria-label="جاري التحميل">
      {Array.from({ length: n }, (_, i) => (
        <div className="card" key={i}>
          <span className="skeleton" style={{ display: "block", width: "55%", height: 18 }} />
          <span className="skeleton" style={{ display: "block", width: "35%", height: 14, marginTop: 10 }} />
          <span className="skeleton" style={{ display: "block", width: "30%", height: 20, marginTop: 14 }} />
        </div>
      ))}
    </div>
  );
}

export const DemoNote = () => <p className="demo-note">* بيانات تجريبية · قيد التطوير</p>;
