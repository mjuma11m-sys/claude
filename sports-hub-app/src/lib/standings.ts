export type Row = { team: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number }
export type Ranked = Row & { pos: number; pts: number; gd: number }

/* Points, then goal difference, then goals for, then name (stable for ties). */
export function rank(rows: Row[]): Ranked[] {
  return rows
    .map((r) => ({ ...r, pts: r.won * 3 + r.drawn, gd: r.gf - r.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team, 'ar'))
    .map((r, i) => ({ ...r, pos: i + 1 }))
}
