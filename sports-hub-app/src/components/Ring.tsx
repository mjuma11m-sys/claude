import { vars } from '../lib/css'

const R = 34
const LEN = 2 * Math.PI * R

/* Readiness ring: the arc draws itself to fit/total. The resting style is the final state, so reduced motion simply shows it. */
export function Ring({ value, total, tone, label, size = 'size-24', text = 'text-2xl' }: { value: number; total: number; tone: string; label: string; size?: string; text?: string }) {
  const f = total === 0 ? 0 : Math.min(1, value / total)
  return (
    <div role="img" aria-label={label} className={`relative shrink-0 ${size}`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" fill="none" strokeWidth="7">
        <circle cx="40" cy="40" r={R} stroke="currentColor" strokeOpacity="0.12" />
        <circle cx="40" cy="40" r={R} stroke="currentColor" strokeLinecap="round" strokeDasharray={LEN} strokeDashoffset={LEN * (1 - f)} className={`gauge-arc ${tone}`} style={vars({ '--len': LEN, '--to': LEN * (1 - f) })} />
      </svg>
      <span aria-hidden className={`font-display absolute inset-0 grid place-items-center ${text} leading-none ${tone}`} dir="ltr"><span className="num">{value}/{total}</span></span>
    </div>
  )
}
