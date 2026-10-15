/* Match report: events the club typed in after the match, and every number the screen shows, derived from them by one function.
   There is no video and no tracking: positions are where the club tapped, so they are approximate. Opponent shots on target are our keeper's saves. */
export type Team = 'us' | 'opp'
export type EKind = 'goal' | 'shot' | 'shot_on' | 'yellow' | 'red' | 'sub' | 'corner'
export type Ev = { minute: number; team: Team; kind: EKind; playerId?: string | null; x?: number | null; y?: number | null }

export const KINDS: EKind[] = ['goal', 'shot_on', 'shot', 'corner', 'yellow', 'red', 'sub']
export const KIND_TEXT: Record<EKind, string> = { goal: 'هدف', shot_on: 'تسديدة على المرمى', shot: 'تسديدة خارج المرمى', corner: 'ركنية', yellow: 'بطاقة صفراء', red: 'بطاقة حمراء', sub: 'تبديل' }
export const MAX_EVENTS = 200
export const MAX_MINUTE = 130
export const BUCKET = 15
export const LATE_FROM = 76
export const MS_PER_MINUTE = 500 // replay at 1x: half a second per match minute, so 90 minutes take 45 seconds
export const SPEEDS = [1, 2, 4] as const

export type Side = { goals: number; shots: number; onTarget: number; corners: number; yellow: number; red: number; subs: number }
export type Snap = { minute: number; us: Side; opp: Side; seen: Ev[] }

const blank = (): Side => ({ goals: 0, shots: 0, onTarget: 0, corners: 0, yellow: 0, red: 0, subs: 0 })
export const isShot = (e: Ev) => e.kind === 'goal' || e.kind === 'shot' || e.kind === 'shot_on'

/* Order by minute, keeping the order typed for equal minutes. */
export const ordered = (events: Ev[]): Ev[] => events.map((e, i) => [e, i] as const).sort((a, b) => a[0].minute - b[0].minute || a[1] - b[1]).map(([e]) => e)

/* The score counts goals only. A goal is also a shot on target; a shot on target that is not a goal is a save (or a miss the club chose to log as on target). */
export function snapshot(events: Ev[], minute: number): Snap {
  const seen = ordered(events).filter((e) => e.minute <= minute)
  const out = { minute, us: blank(), opp: blank(), seen }
  for (const e of seen) {
    const s = out[e.team]
    if (isShot(e)) s.shots++
    if (e.kind === 'goal') { s.goals++; s.onTarget++ }
    else if (e.kind === 'shot_on') s.onTarget++
    else if (e.kind === 'corner') s.corners++
    else if (e.kind === 'yellow') s.yellow++
    else if (e.kind === 'red') s.red++
    else if (e.kind === 'sub') s.subs++
  }
  return out
}

export const lastMinute = (events: Ev[]) => Math.max(90, ...events.map((e) => e.minute))

export type Bucket = { from: number; to: number; us: number; opp: number }
/* Shots per 15 minutes for each side, up to `upTo` (the bar of a bucket still being played grows as the replay passes it). */
export function momentum(events: Ev[], upTo: number = lastMinute(events), end: number = lastMinute(events)): Bucket[] {
  const n = Math.ceil((end + 1) / BUCKET)
  const out: Bucket[] = Array.from({ length: n }, (_, i) => ({ from: i * BUCKET, to: Math.min(end, i * BUCKET + BUCKET - 1), us: 0, opp: 0 }))
  for (const e of events) if (isShot(e) && e.minute <= upTo) out[Math.min(n - 1, Math.floor(e.minute / BUCKET))][e.team]++
  return out
}

export type Keeper = { saves: number; conceded: number; faced: number; pct: number | null }
export function keeperSummary(events: Ev[], minute: number = MAX_MINUTE): Keeper {
  const s = snapshot(events, minute)
  const saves = s.opp.onTarget - s.opp.goals
  return { saves, conceded: s.opp.goals, faced: s.opp.onTarget, pct: s.opp.onTarget > 0 ? saves / s.opp.onTarget : null }
}

export type Insight = { key: string; text: string }
/* Short rules on the team, each shown with its numbers. Nothing here grades a single player. */
export function insights(events: Ev[], possession: number | null): Insight[] {
  const f = snapshot(events, MAX_MINUTE)
  const out: Insight[] = []
  const late = events.filter((e) => e.kind === 'goal' && e.minute >= LATE_FROM)
  const lateUs = late.filter((e) => e.team === 'us').length, lateOpp = late.length - lateUs
  if (lateOpp) out.push({ key: 'late-opp', text: `استقبلنا ${lateOpp === 1 ? 'هدف' : lateOpp + ' أهداف'} بآخر ${90 - LATE_FROM + 1} دقيقة (من الدقيقة ${LATE_FROM}).` })
  if (lateUs) out.push({ key: 'late-us', text: `سجّلنا ${lateUs === 1 ? 'هدف' : lateUs + ' أهداف'} بآخر ${90 - LATE_FROM + 1} دقيقة (من الدقيقة ${LATE_FROM}).` })
  const first = ordered(events).find((e) => e.kind === 'goal')
  if (first && first.team === 'opp' && first.minute <= BUCKET) out.push({ key: 'early', text: `استقبلنا أول هدف بالدقيقة ${first.minute}.` })
  if (f.us.shots >= 8 && f.us.goals <= 1) out.push({ key: 'finishing', text: `سددنا ${f.us.shots} تسديدات (${f.us.onTarget} على المرمى) وسجّلنا ${f.us.goals}.` })
  if (possession !== null && possession >= 60 && f.us.onTarget < f.opp.onTarget) out.push({ key: 'possession', text: `استحواذ ${possession}% مقابل ${f.us.onTarget} تسديدات على المرمى فقط (الخصم ${f.opp.onTarget}).` })
  for (const b of momentum(events)) if (b.opp >= 3 && b.us === 0) { out.push({ key: `press-${b.from}`, text: `ضغط الخصم بين الدقيقة ${b.from} و${b.to}: ${b.opp} تسديدات مقابل صفر.` }); break }
  const red = ordered(events).find((e) => e.kind === 'red' && e.team === 'us')
  if (red) out.push({ key: 'red', text: `لعبنا بنقص بعد البطاقة الحمراء بالدقيقة ${red.minute}.` })
  return out.slice(0, 5)
}

/* Replay clock: advance by real time at the chosen speed, stopping at the end. */
export const advance = (minute: number, dtMs: number, speed: number, end: number) => Math.min(end, minute + (dtMs * speed) / MS_PER_MINUTE)

/* Whole-minute label like 45' or 90+3' beyond the usual end. */
export const clock = (minute: number) => Math.floor(minute)

export function validateEvent(e: Ev): string | null {
  if (!Number.isInteger(e.minute) || e.minute < 0 || e.minute > MAX_MINUTE) return 'bad_minute'
  if (e.playerId && e.team !== 'us') return 'player_on_opponent'
  if ((e.x == null) !== (e.y == null)) return 'bad_position'
  if (e.x != null && (e.x < 0 || e.x > 100 || e.y! < 0 || e.y! > 100)) return 'bad_position'
  return null
}
