import { describe, expect, it } from 'vitest'
import { LEAGUES } from '../src/data/demo.ts'
import { parseStandings } from './standings-csv.mjs'

// Even demo numbers must add up: a fan who checks the table should not find a win without a loss.
describe('demo league tables', () => {
  for (const l of LEAGUES) {
    it(`${l.name} is a closed table`, () => {
      const csv = 'team,played,won,drawn,lost,gf,ga\n' + l.rows.map((r) => [r.team, r.played, r.won, r.drawn, r.lost, r.gf, r.ga].join(',')).join('\n')
      expect(parseStandings(csv).errors).toEqual([])
    })
  }
})
