// مكونات مشتركة بين الشاشات
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePresence, reducedMotion } from "../theme/motion";
import { Icon } from "./icons";

/* ---------- Sheet: نافذة من تحت بالجوال، ووسط الشاشة بالكمبيوتر ---------- */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const state = usePresence(open, 240);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!state) return null;
  return (
    <>
      <div className="dlg-backdrop" data-state={state} onClick={onClose} />
      <div className="dlg" data-state={state} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}>
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
type ToastMsg = { id: number; text: string; undo?: () => void };
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
  const show = useCallback((t: Omit<ToastMsg, "id">) => {
    window.clearTimeout(timer.current);
    setLeaving(false);
    setToast({ ...t, id: Date.now() });
    timer.current = window.setTimeout(hide, 5000);
  }, [hide]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
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

/* ---------- عناصر صغيرة ---------- */
export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className="chip press" onClick={() => onChange(o.id)}>
          {o.label}
          {o.count !== undefined && <span className="num chip-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** شريط تقدّم: يكبر من الصفر أول ما يظهر (scaleX)، ويحمر لو تعدّى 100% */
export function Bar({ value, max, tone }: { value: number; max: number; tone?: "late" | "paid" | "brand" }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const over = value > max;
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((value / (max || 1)) * 100)}>
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
