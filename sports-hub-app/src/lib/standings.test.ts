import { describe, expect, it } from 'vitest'
import { rank } from './standings'

const row = (team: string, won: number, drawn: number, gf: number, ga: number) =>
  ({ team, played: won + drawn, won, drawn, lost: 0, gf, ga })

describe('rank', () => {
  it('orders by points', () => expect(rank([row('أ', 1, 0, 1, 0), row('ب', 2, 0, 2, 0)])[0].team).toBe('ب'))
  it('breaks ties on goal difference, then goals for', () => {
    const r = rank([row('أ', 1, 0, 2, 1), row('ب', 1, 0, 3, 0), row('ج', 1, 0, 4, 1)])
    expect(r.map((x) => x.team)).toEqual(['ج', 'ب', 'أ'])
  })
  it('computes points and positions', () => {
    const [top] = rank([row('أ', 2, 1, 5, 2)])
    expect(top).toMatchObject({ pts: 7, gd: 3, pos: 1 })
  })
})
