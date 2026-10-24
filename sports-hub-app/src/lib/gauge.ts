import type { Zone } from './acwr'

/* The load gauge reads 0 to 2 across a half circle; the bands are the same cut-offs acwr.ts uses for the zones. */
export const GAUGE_MAX = 2
export const gaugeFraction = (ratio: number) => Math.min(1, Math.max(0, ratio / GAUGE_MAX))

const CUTS: [Zone, number][] = [['low', 0.8], ['safe', 1.3], ['caution', 1.5], ['danger', GAUGE_MAX]]
export function zoneArcs() {
  let from = 0
  return CUTS.map(([zone, upTo]) => { const s = { zone, from, to: upTo / GAUGE_MAX }; from = s.to; return s })
}
