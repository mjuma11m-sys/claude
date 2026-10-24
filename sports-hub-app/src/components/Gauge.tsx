import type { Zone } from '../lib/acwr'
import { vars } from '../lib/css'
import { gaugeFraction, zoneArcs } from '../lib/gauge'

const R = 40
const LEN = Math.PI * R
const ARC = 'M 8 50 A 40 40 0 0 1 88 50'
const COLOR: Record<Zone, string> = { low: 'var(--color-mute)', safe: 'var(--color-safe)', caution: 'var(--color-warn)', danger: 'var(--color-crimson-ink)' }

/* Half-circle load gauge. The arc fills to the player's ratio in the color of their zone; the faint bands behind it show the zones.
   The resting style IS the final state, so with reduced motion (animation off) it simply shows the value. */
export function Gauge({ ratio, zone, label }: { ratio: number; zone: Zone; label: string }) {
  const f = gaugeFraction(ratio)
  return (
    <div role="img" aria-label={label} className="relative h-14 w-24 shrink-0">
      <svg viewBox="0 0 96 56" className="size-full" fill="none" strokeWidth="8">
        {zoneArcs().map((s) => (
          <path key={s.zone} d={ARC} stroke={COLOR[s.zone]} strokeOpacity="0.22" strokeDasharray={`${(s.to - s.from) * LEN} ${LEN}`} strokeDashoffset={-s.from * LEN} />
        ))}
        <path
          d={ARC}
          stroke={COLOR[zone]}
          strokeLinecap="round"
          strokeDasharray={LEN}
          strokeDashoffset={LEN * (1 - f)}
          className="gauge-arc"
          style={vars({ '--len': LEN, '--to': LEN * (1 - f) })}
        />
      </svg>
      <span aria-hidden className="font-display absolute inset-x-0 bottom-0 text-center text-2xl leading-none">{ratio.toFixed(2)}</span>
    </div>
  )
}
