/* 28-day load as a line; the last 7 days (the "acute" window) are drawn heavier so the spike is what the eye finds. */
export function Sparkline({ values, tone = 'currentColor', label }: { values: number[]; tone?: string; label: string }) {
  const w = 120, h = 32, pad = 2
  const max = Math.max(...values), min = Math.min(...values)
  const span = max - min || 1
  const pt = (v: number, i: number) => [pad + (i / (values.length - 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)] as const
  const path = (from: number, to: number) => values.slice(from, to).map((v, i) => pt(v, i + from)).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const cut = values.length - 7
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="h-8 w-32 shrink-0" style={{ color: tone }}>
      <path d={path(0, cut + 1)} fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path(cut, values.length)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
