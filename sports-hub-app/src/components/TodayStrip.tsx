import { Link } from 'react-router'
import { jumpTo } from '../lib/anchor'
import { vars } from '../lib/css'
import type { Tone, TodayItem } from '../lib/today'
import { Icon } from './Icon'

const TONE: Record<Tone, { dot: string; ring: string }> = {
  urgent: { dot: 'bg-crimson-ink', ring: 'border-crimson/40' },
  warn: { dot: 'bg-warn', ring: 'border-warn/30' },
  info: { dot: 'bg-pulse', ring: 'border-white/10' },
}

/* One glance: what needs a decision today. Each item is one tap to the place that fixes it. Only urgent items pulse. */
export function TodayStrip({ items, onAct }: { items: TodayItem[]; onAct?: (act: string) => void }) {
  return (
    <section aria-label="اليوم" className="glass rise p-3 md:p-4" style={vars({ '--i': 1 })}>
      <h2 className="mb-2 flex items-center gap-2 px-1 font-display text-xl"><Icon name="bolt" className="size-5 text-pulse" /> اليوم</h2>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-1 py-1 text-sm text-safe"><Icon name="check" className="size-4" /> ما فيه شي يحتاج قرارك الحين.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {items.map((it, i) => {
            const body = (
              <>
                <span aria-hidden className={`relative grid size-2.5 shrink-0 place-items-center`}>
                  {it.tone === 'urgent' && <span className="urgent-ping absolute inset-0 rounded-full bg-crimson-ink" />}
                  <span className={`size-2.5 rounded-full ${TONE[it.tone].dot}`} />
                </span>
                <span className="min-w-0 flex-1 text-sm">{it.text}</span>
                <span aria-hidden className="text-mute">←</span>
              </>
            )
            const cls = `row-in flex min-h-11 items-center gap-3 rounded-xl border bg-white/[0.03] px-3 text-start transition-colors hover:bg-white/[0.07] active:scale-[0.99] ${TONE[it.tone].ring}`
            const style = vars({ '--i': i })
            return (
              <li key={it.key}>
                {it.act ? <button className={`${cls} w-full`} style={style} onClick={() => onAct?.(it.act!)}>{body}</button>
                  : it.to?.startsWith('/') ? <Link to={it.to} className={cls} style={style}>{body}</Link>
                  : <a href={it.to} onClick={(e) => jumpTo(e, it.to)} className={cls} style={style}>{body}</a>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
