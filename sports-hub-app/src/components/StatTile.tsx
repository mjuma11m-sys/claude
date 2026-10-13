import { useCountUp } from '../lib/motion'

/* Big-number tile. The final value is always in the DOM for readers and tests; the animated number is a visual layer. */
export function StatTile({ label, value, tone = '', animate = false, hint }: { label: string; value: number | string; tone?: string; animate?: boolean; hint?: string }) {
  const n = typeof value === 'number' ? value : 0
  const shown = useCountUp(n, animate && typeof value === 'number')
  return (
    <div className="glass h-full px-2 py-3 text-center">
      <p className={`font-display text-4xl leading-none md:text-5xl ${tone}`} dir="ltr">
        <span className="sr-only">{value}</span>
        <span aria-hidden>{typeof value === 'number' ? shown : value}</span>
      </p>
      <p className="mt-1.5 text-xs text-mute">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-mute">{hint}</p>}
    </div>
  )
}
