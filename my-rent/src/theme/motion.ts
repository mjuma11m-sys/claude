// إداراتي — motion hooks (DW-007 · ديوانية الموشن)
// القاعدة: الحركة تخدم التغيير، مو كل فتح. كلها تحترم prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/** يعد للقيمة الجديدة لما تتغيّر بس. أول render يطلع الرقم ثابت. يكمّل من مكانه لو تغيّر نص العد. */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const frame = useRef(0);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    if (reducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (target - from) * easeOut(t)); // integer fils، ما فيه float
      current.current = v;
      setValue(v);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}

/** يخلّي العنصر mounted لين تخلص حركة الخروج. state: "enter" | "exit" | null (مو موجود) */
export function usePresence(open: boolean, exitMs = 220): "enter" | "exit" | null {
  const [state, setState] = useState<"enter" | "exit" | null>(open ? "enter" : null);

  useEffect(() => {
    if (open) {
      setState("enter");
      return;
    }
    setState((s) => (s ? "exit" : null));
    const t = window.setTimeout(() => setState(null), reducedMotion() ? 0 : exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);

  return state;
}

/** stagger مرة وحدة بعد ما تخلص البيانات تتحمل (loading: true → false). حد أقصى 8 عناصر. */
export function useStagger(loading: boolean) {
  const [play, setPlay] = useState(false);
  const wasLoading = useRef(loading);

  useEffect(() => {
    const finished = wasLoading.current && !loading;
    wasLoading.current = loading;
    if (!finished || reducedMotion()) return;
    setPlay(true);
    const t = window.setTimeout(() => setPlay(false), 8 * 40 + 300);
    return () => window.clearTimeout(t);
  }, [loading]);

  return (index: number) =>
    play && index < 8 ? { className: "stagger", style: { animationDelay: `${index * 40}ms` } } : { className: "", style: undefined };
}

/** true لمدة النبضة لما القيمة تتحول لـ match (مثلاً الحالة صارت "paid"). أول render ما ينبض. */
export function usePulseOn<T>(value: T, match: T, ms = 400): boolean {
  const [pulse, setPulse] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value && value === match && !reducedMotion()) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), ms);
      prev.current = value;
      return () => window.clearTimeout(t);
    }
    prev.current = value;
  }, [value, match, ms]);

  return pulse;
}

/** يعيد تشغيل حركة CSS على العنصر لما key يتغيّر — بدون remount، فالـ state (فلتر، scroll) يبقى. */
export function useReplayClass<T extends HTMLElement>(key: unknown, className: string) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = ref.current;
    if (!el || reducedMotion()) return;
    el.classList.remove(className);
    void el.offsetWidth; // reflow عشان الحركة تعيد
    el.classList.add(className);
  }, [key, className]);
  return ref;
}
