import { useEffect, useState } from 'react'

export const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* True the first time this tab sees `key`, false after. Entrance flourishes use it so they play once per session, not on every visit. */
export function useIntro(key: string) {
  const [first] = useState(() => {
    try { return !sessionStorage.getItem(key) && !prefersReducedMotion() } catch { return false }
  })
  useEffect(() => { try { sessionStorage.setItem(key, '1') } catch { /* private mode */ } }, [key])
  return first
}

/* Eases a number up from 0. The final value is always what assistive tech and tests read (see <Num>), this only dresses the first paint. */
export function useCountUp(target: number, run: boolean, ms = 650) {
  const [v, setV] = useState(() => (run ? 0 : target))
  useEffect(() => {
    if (!run) { setV(target); return }
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, run, ms])
  return v
}
