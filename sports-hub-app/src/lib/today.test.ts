import { describe, expect, it } from 'vitest'
import { clubToday, federationToday } from './today'

const day = (n: number) => new Date(Date.UTC(2026, 9, 14) + n * 86_400_000).toISOString().slice(0, 10)
const today = new Date(2026, 9, 14)
const p = (status: 'fit' | 'doubtful' | 'injured' | 'suspended', endsIn: number) => ({ status, endsOn: day(endsIn) })
const base = { ratio: 0.5, limit: 0.7, imported: true, today }

describe('what needs you today (club)', () => {
  it('says nothing when everything is fine', () => {
    expect(clubToday({ ...base, squad: [p('fit', 400)] })).toEqual([])
  })
  it('puts ended contracts and an over-limit ratio before softer items', () => {
    const items = clubToday({ ...base, ratio: 0.8, squad: [p('fit', -3), p('injured', 90), p('doubtful', 400)] })
    expect(items.map((i) => i.key)).toEqual(['over', 'ended', 'soon', 'out', 'maybe'])
  })
  it('counts match the squad exactly', () => {
    const items = clubToday({ ...base, squad: [p('fit', -1), p('fit', -20), p('fit', 30), p('injured', 400), p('suspended', 400)] })
    expect(items.find((i) => i.key === 'ended')!.text).toBe('عقود منتهية وما انجددت: 2')
    expect(items.find((i) => i.key === 'soon')!.text).toBe('عقود تنتهي خلال 6 أشهر: 1')
    expect(items.find((i) => i.key === 'out')!.text).toBe('لاعبون غير متاحين (إصابة أو إيقاف): 2')
  })
  it('a filed report inside the limit adds nothing; a missing one asks for it; trial data points at the data center', () => {
    expect(clubToday({ ...base, ratio: null, squad: [] }).map((i) => i.key)).toEqual(['report'])
    expect(clubToday({ ...base, imported: false, squad: [] })).toEqual([{ key: 'data', tone: 'info', text: 'البيانات تجريبية. ابدأ باستيراد بيانات ناديك', to: '/data' }])
  })
  it('shows at most five items', () => {
    expect(clubToday({ ratio: 0.8, limit: 0.7, imported: false, today, squad: [p('fit', -1), p('fit', 30), p('injured', 400), p('doubtful', 400)] })).toHaveLength(5)
  })
})

describe('what needs you today (federation)', () => {
  it('lists over, near and missing counts in that order, and skips zeros', () => {
    expect(federationToday([{ status: 'missing' }, { status: 'over' }, { status: 'over' }, { status: 'within' }]).map((i) => [i.key, i.text])).toEqual([['over', 'أندية تجاوزت حد الأجور: 2'], ['missing', 'أندية ما رفعت تقرير الموسم: 1']])
    expect(federationToday([{ status: 'within' }])).toEqual([])
  })
})
