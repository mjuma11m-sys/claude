import { describe, expect, it } from 'vitest'
import { parseStandings } from './standings-csv.mjs'

const head = 'team,played,won,drawn,lost,gf,ga\n'
const ok = head + 'أ,2,1,1,0,3,1\nب,2,0,1,1,1,3\n'

describe('parseStandings', () => {
  it('accepts a closed, consistent table', () => expect(parseStandings(ok).errors).toEqual([]))
  it('reads rows as numbers', () => expect(parseStandings(ok).rows[0]).toEqual({ team: 'أ', played: 2, won: 1, drawn: 1, lost: 0, gf: 3, ga: 1 }))
  it('handles a BOM, CRLF and column order', () => {
    const r = parseStandings('﻿team,ga,gf,lost,drawn,won,played\r\nأ,1,3,0,1,1,2\r\nب,3,1,1,1,0,2\r\n')
    expect(r.errors).toEqual([])
    expect(r.rows[0].gf).toBe(3)
  })
  it('rejects played ≠ w+d+l', () => expect(parseStandings(head + 'أ,3,1,1,0,3,1\nب,2,0,1,1,1,3\n').errors[0]).toMatch(/لعب 3/))
  it('rejects duplicates and blanks', () => {
    expect(parseStandings(head + 'أ,1,1,0,0,1,0\nأ,1,0,0,1,0,1\n').errors.some((e) => e.includes('مكرر'))).toBe(true)
    expect(parseStandings(head + ',1,1,0,0,1,0\n').errors[0]).toMatch(/فاضي/)
  })
  it('rejects non-numbers and negatives', () => {
    expect(parseStandings(head + 'أ,x,1,0,0,1,0\n').errors[0]).toMatch(/played/)
    expect(parseStandings(head + 'أ,1,-1,0,2,1,0\n').errors.length).toBeGreaterThan(0)
  })
  it('catches a table that does not close (a missing club or a typo)', () => {
    const r = parseStandings(head + 'أ,2,1,1,0,3,1\nب,2,0,1,1,1,4\n')
    expect(r.errors[0]).toMatch(/الأهداف/)
    expect(parseStandings(head + 'أ,1,1,0,0,1,0\n').errors[0]).toMatch(/الفوز/)
  })
  it('names the missing header columns', () => expect(parseStandings('team,played\nأ,1\n').errors[0]).toContain('won'))
  it('accepts quoted names with commas', () => expect(parseStandings(head + '"أ, ب",2,1,1,0,3,1\nج,2,0,1,1,1,3\n').rows[0].team).toBe('أ, ب'))
})
