import { FFP_LABEL, type FfpStatus } from '../lib/ffp'

const FILL: Record<FfpStatus, string> = { within: 'bg-safe', near: 'bg-warn', over: 'bg-crimson-ink', missing: 'bg-white/20' }
export const CHIP: Record<FfpStatus, string> = {
  within: 'bg-safe/15 text-safe',
  near: 'bg-warn/15 text-warn',
  over: 'bg-crimson/20 text-crimson-ink',
  missing: 'bg-white/10 text-mute',
}

export function StatusChip({ status }: { status: FfpStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${CHIP[status]}`}>{FFP_LABEL[status]}</span>
}

/* Wages as a share of revenue against the limit. Scale is 0 to 100% of revenue; the tick marks the limit. */
export function RatioBar({ ratio, limit, status }: { ratio: number | null; limit: number; status: FfpStatus }) {
  const pct = Math.min(1, ratio ?? 0) * 100
  const label = ratio === null ? 'لم يرفع تقرير' : `الأجور ${Math.round(ratio * 100)}% من الإيرادات، والحد ${Math.round(limit * 100)}%`
  return (
    <div role="img" aria-label={label} className="relative h-3 w-full rounded-full bg-white/[0.07]">
      {ratio !== null && <div className={`grow absolute inset-y-0 start-0 rounded-full ${FILL[status]}`} style={{ width: `${pct}%` }} />}
      <span aria-hidden className="absolute -inset-y-1 w-0.5 rounded-full bg-ink/80" style={{ insetInlineStart: `${limit * 100}%` }} />
    </div>
  )
}
