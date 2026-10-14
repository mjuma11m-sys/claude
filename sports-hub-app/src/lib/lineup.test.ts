import { describe, expect, it } from 'vitest'
import { canSave, FORMATION_SLOTS, FORMATIONS, lineupText, reshape, roleOf, suggestLineup, validateLineup, fitOf, type LPlayer, type Lineup } from './lineup'

const P = (num: number, pos: string, status: LPlayer['status'] = 'fit'): LPlayer => ({ id: `p${num}`, num, name: `لاعب ${num}`, pos, status })
const SQUAD: LPlayer[] = [
  P(1, 'حارس مرمى'), P(22, 'حارس مرمى'), P(2, 'ظهير أيمن'), P(3, 'ظهير أيسر', 'doubtful'), P(4, 'قلب دفاع'), P(5, 'قلب دفاع', 'injured'), P(15, 'قلب دفاع'),
  P(6, 'وسط ارتكاز'), P(8, 'وسط'), P(10, 'صانع ألعاب'), P(14, 'وسط', 'suspended'), P(21, 'وسط'),
  P(7, 'جناح'), P(11, 'جناح'), P(9, 'مهاجم'), P(17, 'مهاجم'), P(19, 'مهاجم', 'injured'),
  P(12, 'وسط'), P(13, 'قلب دفاع'), P(16, 'جناح'), P(18, 'مهاجم'),
]
const none = { rating: {}, zone: {} }

describe('formations', () => {
  it('every formation has exactly 11 slots, numbered 1 to 11, with the goalkeeper in slot 1', () => {
    for (const f of FORMATIONS) {
      const s = FORMATION_SLOTS[f]
      expect(s.map((x) => x.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
      expect(s[0].role).toBe('GK')
      expect(s.filter((x) => x.role === 'GK')).toHaveLength(1)
    }
  })
  it('the name of each formation matches its lines (defenders-midfielders-forwards)', () => {
    const count = (f: (typeof FORMATIONS)[number], r: string) => FORMATION_SLOTS[f].filter((s) => s.role === r).length
    expect([count('4-3-3', 'DEF'), count('4-3-3', 'MID'), count('4-3-3', 'ATT')]).toEqual([4, 3, 3])
    expect([count('4-4-2', 'DEF'), count('4-4-2', 'MID'), count('4-4-2', 'ATT')]).toEqual([4, 4, 2])
    expect([count('4-2-3-1', 'DEF'), count('4-2-3-1', 'MID'), count('4-2-3-1', 'ATT')]).toEqual([4, 5, 1])
    expect([count('3-5-2', 'DEF'), count('3-5-2', 'MID'), count('3-5-2', 'ATT')]).toEqual([3, 5, 2])
  })
  it('slots stay inside the pitch and never share a spot', () => {
    for (const f of FORMATIONS) {
      const pts = FORMATION_SLOTS[f].map((s) => `${s.x},${s.y}`)
      expect(new Set(pts).size).toBe(11)
      for (const s of FORMATION_SLOTS[f]) { expect(s.x).toBeGreaterThanOrEqual(5); expect(s.x).toBeLessThanOrEqual(95); expect(s.y).toBeGreaterThan(10); expect(s.y).toBeLessThan(95) }
    }
  })
})

describe('positions', () => {
  it('maps the Arabic position names to a line', () => {
    expect([roleOf('حارس مرمى'), roleOf('ظهير أيمن'), roleOf('قلب دفاع'), roleOf('وسط ارتكاز'), roleOf('صانع ألعاب'), roleOf('جناح'), roleOf('مهاجم'), roleOf('???')]).toEqual(['GK', 'DEF', 'DEF', 'MID', 'MID', 'ATT', 'ATT', null])
  })
  it('natural position beats next door beats out of position; a goalkeeper only fits the goal', () => {
    expect([fitOf('DEF', 'DEF'), fitOf('MID', 'DEF'), fitOf('DEF', 'MID'), fitOf('ATT', 'MID'), fitOf('DEF', 'ATT'), fitOf('GK', 'DEF'), fitOf('MID', 'GK'), fitOf(null, 'MID')]).toEqual([2, 1, 1, 1, 0, 0, 0, 0])
  })
})

describe('the suggestion', () => {
  it('fills all 11 slots for every formation without an injured or suspended player, one goalkeeper, no repeats', () => {
    for (const f of FORMATIONS) {
      const s = suggestLineup(f, SQUAD, none)
      const ids = [...Object.values(s.lineup.starters), ...s.lineup.bench]
      expect(Object.keys(s.lineup.starters)).toHaveLength(11)
      expect(new Set(ids).size).toBe(ids.length)
      const by = new Map(SQUAD.map((p) => [p.id, p]))
      expect(ids.every((id) => !['injured', 'suspended'].includes(by.get(id)!.status))).toBe(true)
      expect(Object.values(s.lineup.starters).filter((id) => roleOf(by.get(id)!.pos) === 'GK')).toHaveLength(1)
      expect(canSave(validateLineup(s.lineup, SQUAD))).toBe(true)
    }
  })
  it('puts the natural position first, then readiness: a fit defender beats a doubtful one', () => {
    const s = suggestLineup('4-3-3', SQUAD, none)
    expect(s.lineup.starters[1]).toBe('p1')
    expect(Object.values(s.lineup.starters)).not.toContain('p3') // enough fit defenders: the doubtful one stays out of the eleven
  })
  it('uses the coach rating and the load as tie-breakers, and says why', () => {
    const s = suggestLineup('4-3-3', SQUAD, { rating: { p9: 4.5, p17: 3 }, zone: { p9: 'danger', p17: 'safe' } })
    expect(s.lineup.starters[10]).toBeDefined()
    expect(s.reasons[s.lineup.starters[10]]).toContain('مركزه الأصلي')
    const withLoad = suggestLineup('4-4-2', SQUAD, { rating: { p9: 4.5, p17: 3 }, zone: { p9: 'danger', p17: 'safe' } })
    expect(Object.values(withLoad.lineup.starters)).toContain('p9') // both forwards play in a 4-4-2, rating plus penalty still picks them
    expect(withLoad.reasons.p9).toContain('حمل مرتفع: انتبه')
  })
  it('the bench gets a goalkeeper first, then different lines', () => {
    const s = suggestLineup('4-3-3', SQUAD, none)
    const by = new Map(SQUAD.map((p) => [p.id, p]))
    expect(roleOf(by.get(s.lineup.bench[0])!.pos)).toBe('GK')
    expect(new Set(s.lineup.bench.slice(1, 4).map((id) => roleOf(by.get(id)!.pos))).size).toBeGreaterThanOrEqual(2)
    expect(s.lineup.bench.length).toBe(7)
  })
  it('without a healthy goalkeeper it leaves the goal empty and says so; it never puts an outfielder there', () => {
    const s = suggestLineup('4-3-3', SQUAD.filter((p) => roleOf(p.pos) !== 'GK'), none)
    expect(s.lineup.starters[1]).toBeUndefined()
    expect(s.notes.join(' ')).toContain('حارس')
  })
  it('with fewer than 11 available it fills what it can and warns', () => {
    const s = suggestLineup('4-3-3', SQUAD.slice(0, 6), none)
    expect(Object.keys(s.lineup.starters).length).toBeLessThan(11)
    expect(s.notes.length).toBeGreaterThan(0)
  })
})

describe('the checks', () => {
  const full = suggestLineup('4-3-3', SQUAD, none).lineup
  it('a suggested lineup is clean', () => {
    expect(validateLineup(full, SQUAD).filter((i) => i.level === 'error')).toEqual([])
  })
  it('counts starters, and names an injured or suspended player', () => {
    const short: Lineup = { ...full, starters: Object.fromEntries(Object.entries(full.starters).slice(0, 10)) }
    expect(validateLineup(short, SQUAD).some((i) => i.code === 'wrong_count' && i.text === 'الأساسيون 10 من 11')).toBe(true)
    const hurt: Lineup = { ...full, starters: { ...full.starters, 5: 'p5' } }
    expect(validateLineup(hurt, SQUAD).some((i) => i.code === 'unavailable' && i.text.includes('مصاب'))).toBe(true)
    expect(canSave(validateLineup(hurt, SQUAD))).toBe(false)
    const susp: Lineup = { ...full, bench: ['p14'] }
    expect(validateLineup(susp, SQUAD).some((i) => i.code === 'unavailable' && i.text.includes('موقوف'))).toBe(true)
  })
  it('one goalkeeper, in goal', () => {
    expect(validateLineup({ ...full, starters: { ...full.starters, 1: 'p8' } }, SQUAD).map((i) => i.code)).toContain('outfield_in_goal')
    expect(validateLineup({ ...full, starters: { ...full.starters, 2: 'p22' } }, SQUAD).map((i) => i.code)).toEqual(expect.arrayContaining(['two_goalkeepers', 'goalkeeper_not_in_goal']))
  })
  it('a doubtful player or an out-of-position one is a warning, not a block', () => {
    const l: Lineup = { formation: '4-3-3', bench: ['p22'], starters: { 1: 'p1', 2: 'p2', 3: 'p4', 4: 'p15', 5: 'p3', 6: 'p8', 7: 'p6', 8: 'p21', 9: 'p7', 10: 'p13', 11: 'p11' } }
    const i = validateLineup(l, SQUAD)
    expect(i.some((x) => x.code === 'doubtful' && x.level === 'warn')).toBe(true)
    expect(i.some((x) => x.code === 'out_of_position' && x.level === 'warn')).toBe(true)
    expect(canSave(i)).toBe(true)
  })
  it('duplicates, an oversized bench and a bench without a goalkeeper', () => {
    expect(validateLineup({ ...full, bench: [full.starters[2]] }, SQUAD).map((i) => i.code)).toContain('duplicate_player')
    const many = SQUAD.filter((p) => !Object.values(full.starters).includes(p.id)).map((p) => p.id)
    expect(validateLineup({ ...full, bench: [...many, ...many] }, SQUAD).map((i) => i.code)).toContain('bench_too_big')
    expect(validateLineup({ ...full, bench: ['p15'] }, SQUAD).map((i) => i.code)).toContain('no_bench_goalkeeper')
  })
})

describe('changing formation', () => {
  it('keeps every player and the goalkeeper in goal', () => {
    const l = suggestLineup('4-3-3', SQUAD, none).lineup
    const r = reshape(l, '3-5-2', SQUAD)
    expect(Object.values(r.starters).sort()).toEqual(Object.values(l.starters).sort())
    expect(r.starters[1]).toBe(l.starters[1])
    expect(r.formation).toBe('3-5-2')
  })
})

describe('the shareable text', () => {
  it('lists starters in slot order and the bench, with numbers and names only', () => {
    const l = suggestLineup('4-4-2', SQUAD, none).lineup
    const t = lineupText(l, SQUAD, { opponent: 'خصم', matchOn: '2026-10-17' })
    expect(t.split('\n')[0]).toBe('تشكيلة المباراة ضد خصم · 2026-10-17')
    expect(t).toContain('التشكيل: 4-4-2')
    expect(t).toContain('1 · لاعب 1')
    expect(t.match(/ · لاعب /g)!.length).toBe(11 + l.bench.length)
  })
})
