/* Match lineup: formation slots, a draft suggestion, and the checks. The suggestion is a plain rule the screen explains
   (position, availability, load, the coach's rating), not intelligence: the coach decides. The same checks run in the database (save_lineup). */
import type { Zone } from './acwr'
import type { PlayerStatus } from './squad'

export type Formation = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2'
export const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2']
export type Role = 'GK' | 'DEF' | 'MID' | 'ATT'
export type SlotDef = { slot: number; role: Role; x: number; y: number; label: string }
export type LPlayer = { id: string; num: number | null; name: string; pos: string; status: PlayerStatus }
export type Lineup = { formation: Formation; starters: Record<number, string>; bench: string[] }

/* Slot 1 is always the goalkeeper. x runs across the pitch (0-100), y from the opponent's goal (0) to ours (100). The view is from behind
   our own goal, so the right-hand side of the screen is the team's right: right back at x=86. */
const row = (role: Role, y: number, xs: number[], labels: string[], from: number): SlotDef[] => xs.map((x, i) => ({ slot: from + i, role, x, y, label: labels[i] }))
const GK: SlotDef = { slot: 1, role: 'GK', x: 50, y: 90, label: 'حارس' }
export const FORMATION_SLOTS: Record<Formation, SlotDef[]> = {
  '4-3-3': [GK, ...row('DEF', 72, [86, 62, 38, 14], ['ظهير أيمن', 'قلب دفاع', 'قلب دفاع', 'ظهير أيسر'], 2), ...row('MID', 52, [28, 50, 72], ['وسط', 'وسط ارتكاز', 'وسط'], 6), ...row('ATT', 24, [18, 50, 82], ['جناح', 'مهاجم', 'جناح'], 9)],
  '4-4-2': [GK, ...row('DEF', 72, [86, 62, 38, 14], ['ظهير أيمن', 'قلب دفاع', 'قلب دفاع', 'ظهير أيسر'], 2), ...row('MID', 50, [86, 62, 38, 14], ['جناح أيمن', 'وسط', 'وسط', 'جناح أيسر'], 6), ...row('ATT', 22, [36, 64], ['مهاجم', 'مهاجم'], 10)],
  '4-2-3-1': [GK, ...row('DEF', 72, [86, 62, 38, 14], ['ظهير أيمن', 'قلب دفاع', 'قلب دفاع', 'ظهير أيسر'], 2), ...row('MID', 58, [36, 64], ['وسط ارتكاز', 'وسط ارتكاز'], 6), ...row('MID', 38, [18, 50, 82], ['جناح', 'صانع ألعاب', 'جناح'], 8), ...row('ATT', 18, [50], ['مهاجم'], 11)],
  '3-5-2': [GK, ...row('DEF', 74, [24, 50, 76], ['قلب دفاع', 'قلب دفاع', 'قلب دفاع'], 2), ...row('MID', 50, [8, 29, 50, 71, 92], ['ظهير جناح', 'وسط', 'وسط ارتكاز', 'وسط', 'ظهير جناح'], 5), ...row('ATT', 22, [36, 64], ['مهاجم', 'مهاجم'], 10)],
}
export const MAX_BENCH = 9 // a competition rule we do not know: one value, in the app and in the database

export function roleOf(pos: string): Role | null {
  if (pos.includes('حارس')) return 'GK'
  if (/ظهير|قلب|مدافع|دفاع/.test(pos)) return 'DEF'
  if (/وسط|صانع/.test(pos)) return 'MID'
  if (/جناح|مهاجم/.test(pos)) return 'ATT'
  return null
}
/* 2 = natural position, 1 = next door (defence-midfield, midfield-attack), 0 = out of position. */
export function fitOf(player: Role | null, slot: Role): 0 | 1 | 2 {
  if (player === null) return 0
  if (player === slot) return 2
  if (player === 'GK' || slot === 'GK') return 0
  return (player === 'MID' && slot !== 'MID') || (slot === 'MID' && player !== 'MID') ? 1 : 0
}
export const FIT_TEXT = ['خارج مركزه', 'قريب من المركز', 'مركزه الأصلي']
const unavailable = (s: PlayerStatus) => s === 'injured' || s === 'suspended'

/* ---------- checks ---------- */
export type Issue = { code: string; level: 'error' | 'warn'; text: string; slot?: number }
export function validateLineup(l: Lineup, players: LPlayer[]): Issue[] {
  const by = new Map(players.map((p) => [p.id, p]))
  const defs = new Map(FORMATION_SLOTS[l.formation].map((s) => [s.slot, s]))
  const out: Issue[] = []
  const slots = Object.entries(l.starters).map(([k, id]) => ({ slot: Number(k), p: by.get(id) })).filter((x): x is { slot: number; p: LPlayer } => !!x.p)
  const n = slots.length
  if (n !== 11) out.push({ code: 'wrong_count', level: 'error', text: `الأساسيون ${n} من 11` })
  const gks = slots.filter((x) => roleOf(x.p.pos) === 'GK')
  if (gks.length === 0 && n > 0) out.push({ code: 'no_goalkeeper', level: 'error', text: 'ما فيه حارس بالأساسيين' })
  if (gks.length > 1) out.push({ code: 'two_goalkeepers', level: 'error', text: 'أكثر من حارس بالأساسيين' })
  for (const { slot, p } of slots) {
    const def = defs.get(slot)
    if (slot === 1 && roleOf(p.pos) !== 'GK') out.push({ code: 'outfield_in_goal', level: 'error', text: `${p.name} لاعب ميدان بالمرمى`, slot })
    if (slot !== 1 && roleOf(p.pos) === 'GK') out.push({ code: 'goalkeeper_not_in_goal', level: 'error', text: `${p.name} حارس خارج المرمى`, slot })
    if (def && slot !== 1 && roleOf(p.pos) !== 'GK' && fitOf(roleOf(p.pos), def.role) === 0) out.push({ code: 'out_of_position', level: 'warn', text: `${p.name} خارج مركزه (${def.label})`, slot })
  }
  const all = [...slots.map((x) => x.p), ...l.bench.map((id) => by.get(id)).filter((p): p is LPlayer => !!p)]
  for (const p of all) {
    if (unavailable(p.status)) out.push({ code: 'unavailable', level: 'error', text: `${p.name} ${p.status === 'injured' ? 'مصاب' : 'موقوف'}` })
    if (p.status === 'doubtful') out.push({ code: 'doubtful', level: 'warn', text: `${p.name} مشكوك بجاهزيته` })
  }
  if (new Set(all.map((p) => p.id)).size !== all.length) out.push({ code: 'duplicate_player', level: 'error', text: 'لاعب مكرر بالأساسيين أو البدلاء' })
  if (l.bench.length > MAX_BENCH) out.push({ code: 'bench_too_big', level: 'error', text: `البدلاء أكثر من ${MAX_BENCH}` })
  if (n === 11 && l.bench.length > 0 && !l.bench.some((id) => by.get(id) && roleOf(by.get(id)!.pos) === 'GK')) out.push({ code: 'no_bench_goalkeeper', level: 'warn', text: 'ما فيه حارس احتياطي' })
  return out
}
export const canSave = (issues: Issue[]) => issues.every((i) => i.level !== 'error')

/* ---------- the draft ---------- */
export type SuggestCtx = { rating: Record<string, number>; zone: Record<string, Zone | null> }
export type Suggestion = { lineup: Lineup; reasons: Record<string, string[]>; notes: string[] }

function score(p: LPlayer, slot: Role | null, c: SuggestCtx): number {
  const fit = slot ? fitOf(roleOf(p.pos), slot) : 2
  const z = c.zone[p.id]
  return (fit === 2 ? 20 : fit === 1 ? 8 : 0) + (p.status === 'fit' ? 3 : 1) + (z === 'danger' ? -2 : z === 'caution' ? -1 : 0) + (c.rating[p.id] ?? 0)
}
function why(p: LPlayer, slot: Role, c: SuggestCtx): string[] {
  const out = [FIT_TEXT[fitOf(roleOf(p.pos), slot)], p.status === 'doubtful' ? 'مشكوك بجاهزيته' : 'جاهز']
  const z = c.zone[p.id]
  if (z === 'caution' || z === 'danger') out.push('حمل مرتفع: انتبه')
  if ((c.rating[p.id] ?? 0) >= 4) out.push('تقييم المدرب مرتفع')
  return out
}

export function suggestLineup(formation: Formation, players: LPlayer[], c: SuggestCtx, benchSize = 7): Suggestion {
  const pool = players.filter((p) => !unavailable(p.status))
  const used = new Set<string>()
  const starters: Record<number, string> = {}
  const reasons: Record<string, string[]> = {}
  const notes: string[] = []
  for (const def of FORMATION_SLOTS[formation]) {
    const cands = pool.filter((p) => !used.has(p.id) && (def.role === 'GK' ? roleOf(p.pos) === 'GK' : roleOf(p.pos) !== 'GK'))
    const best = cands.sort((a, b) => score(b, def.role, c) - score(a, def.role, c) || (a.num ?? 99) - (b.num ?? 99))[0]
    if (!best) { notes.push(def.role === 'GK' ? 'ما فيه حارس متاح: خانة الحارس فاضية' : `ما فيه لاعب ميدان متاح كفاية: ${def.label} فاضي`); continue }
    used.add(best.id); starters[def.slot] = best.id; reasons[best.id] = why(best, def.role, c)
  }
  const bench: string[] = []
  const left = () => pool.filter((p) => !used.has(p.id))
  const gk = left().filter((p) => roleOf(p.pos) === 'GK').sort((a, b) => (c.rating[b.id] ?? 0) - (c.rating[a.id] ?? 0) || (a.num ?? 99) - (b.num ?? 99))[0]
  if (gk && benchSize > 0) { used.add(gk.id); bench.push(gk.id); reasons[gk.id] = ['حارس احتياطي'] }
  const seen = new Set<Role | null>([roleOf(gk?.pos ?? '')])
  while (bench.length < benchSize) {
    const rest = left()
    if (rest.length === 0) break
    // one of each outfield role first, so the bench can cover a defender, a midfielder and a forward
    const fresh = rest.filter((p) => !seen.has(roleOf(p.pos)))
    const pick = (fresh.length ? fresh : rest).sort((a, b) => score(b, null, c) - score(a, null, c) || (a.num ?? 99) - (b.num ?? 99))[0]
    used.add(pick.id); seen.add(roleOf(pick.pos)); bench.push(pick.id); reasons[pick.id] = ['بديل']
  }
  return { lineup: { formation, starters, bench }, reasons, notes }
}

/* Changing the formation keeps the players: each one moves to the free slot that suits them best. */
export function reshape(l: Lineup, formation: Formation, players: LPlayer[]): Lineup {
  const by = new Map(players.map((p) => [p.id, p]))
  const starters: Record<number, string> = {}
  const rest = Object.values(l.starters).map((id) => by.get(id)).filter((p): p is LPlayer => !!p)
  const defs = FORMATION_SLOTS[formation]
  const gk = rest.find((p) => roleOf(p.pos) === 'GK')
  if (gk) starters[1] = gk.id
  const open = defs.filter((d) => d.slot !== 1)
  const left = rest.filter((p) => p !== gk)
  for (const d of open) {
    const i = left.reduce((best, p, k) => (fitOf(roleOf(p.pos), d.role) > fitOf(roleOf(left[best].pos), d.role) ? k : best), 0)
    if (left.length === 0) break
    const [p] = left.splice(i, 1)
    starters[d.slot] = p.id
  }
  return { formation, starters, bench: l.bench }
}

export function lineupText(l: Lineup, players: LPlayer[], meta: { opponent: string; matchOn: string }): string {
  const by = new Map(players.map((p) => [p.id, p]))
  const line = (p: LPlayer) => `${p.num ?? '—'} · ${p.name}`
  const starters = FORMATION_SLOTS[l.formation].map((d) => by.get(l.starters[d.slot])).filter((p): p is LPlayer => !!p)
  const bench = l.bench.map((id) => by.get(id)).filter((p): p is LPlayer => !!p)
  return [`تشكيلة المباراة ضد ${meta.opponent} · ${meta.matchOn}`, `التشكيل: ${l.formation}`, '', 'الأساسيون:', ...starters.map(line), '', 'البدلاء:', ...(bench.length ? bench.map(line) : ['—'])].join('\n')
}
