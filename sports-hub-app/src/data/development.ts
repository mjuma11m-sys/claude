/* Development data: ratings, goals, session logs. With Supabase these are RLS-guarded tables (migration 0008);
   without it, a sandbox in this browser seeded with a fictional goalkeeper and a few players, labelled as a trial. */
import { supabase } from '../lib/supabase'
import type { Assessment, Goal, Log, SkillId } from '../lib/development'
import type { PlayerStatus } from '../lib/squad'
import { readDemoImport, readDemoRoster } from './datacenter'
import { readDemoAvail } from './availability'
import { DEMO_SQUAD } from './demo'

export type DevPlayer = { id: string; num: number | null; name: string; pos: string; status: PlayerStatus; note?: string | null; returnOn?: string | null; yellow?: number; red?: number }
export type DevData = { players: DevPlayer[]; assessments: Record<string, Assessment[]>; goals: Record<string, Goal[]>; logs: Record<string, Log[]> }

const KEY = 'sh.demoDev'
type Store = DevData
const read = (): Store | null => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Store) : null } catch { return null } }
const write = (s: Store) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* session-only */ } }
const iso = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10)
const ahead = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

/* A fictional goalkeeper with three months of ratings and five weeks of sessions, so every screen has something honest to show. */
function seed(): Store {
  const gk = 'demo-1'
  const rate = (back: number, scores: Partial<Record<SkillId, number>>): Assessment[] => Object.entries(scores).map(([skill, score]) => ({ day: iso(back), skill: skill as SkillId, score: score! }))
  const assessments: Record<string, Assessment[]> = {
    [gk]: [
      ...rate(75, { reflexes: 3, diving: 2, high_balls: 3, footwork: 4, distribution: 3, one_v_one: 2, organisation: 3 }),
      ...rate(40, { reflexes: 3, diving: 3, high_balls: 3, footwork: 4, distribution: 4, one_v_one: 2, organisation: 3 }),
      ...rate(5, { reflexes: 4, diving: 3, high_balls: 3, footwork: 4, distribution: 4, one_v_one: 3, organisation: 4 }),
    ],
    'demo-8': rate(30, { first_touch: 3, passing: 4, shooting: 3, defending: 3, speed_agility: 3, positioning: 4 }),
  }
  const goals: Record<string, Goal[]> = {
    [gk]: [
      { id: 'g1', skill: 'reflexes', target: 5, dueOn: ahead(60), done: false },
      { id: 'g2', skill: 'one_v_one', target: 4, dueOn: ahead(45), done: false },
    ],
  }
  // Five sessions a week for five weeks; the last week is a little heavier.
  const logs: Record<string, Log[]> = { [gk]: Array.from({ length: 35 }, (_, i) => i).filter((i) => i % 7 !== 1 && i % 7 !== 4).map((i) => ({ day: iso(i), minutes: 70, rpe: i < 7 ? 7 : i % 3 === 0 ? 6 : 5 })) }
  return { players: [], assessments, goals, logs }
}

async function demoPlayers(): Promise<DevPlayer[]> {
  const trial = readDemoImport()
  const base: DevPlayer[] = trial
    ? trial.map((r) => ({ id: `imp-${r.num}`, num: r.num, name: r.name, pos: r.pos, status: r.status }))
    : DEMO_SQUAD.map((p) => ({ id: p.id, num: p.num, name: p.name, pos: p.pos, status: p.status }))
  const added: DevPlayer[] = readDemoRoster().filter((r) => !base.some((b) => b.num === r.num)).map((r) => ({ id: `add-${r.num}`, num: r.num, name: r.name, pos: r.pos, status: 'fit' as const }))
  const ov = readDemoAvail()
  return [...base, ...added].map((p) => { const o = ov[p.id]; return o ? { ...p, status: o.status, note: o.note, returnOn: o.returnOn, yellow: o.yellow, red: o.red } : p }).sort((a, b) => (a.num ?? 99) - (b.num ?? 99))
}
const demoState = (): Store => read() ?? seed()

/* Insert, and on a duplicate key amend only the value columns. PostgREST's own upsert rewrites every column it was sent, including the
   key columns, which the database (rightly) does not let the app update. */
async function insertOrAmend(table: 'skill_assessments' | 'training_logs', row: Record<string, unknown>, keys: string[], values: string[]): Promise<void> {
  const ins = await supabase!.from(table).insert(row)
  if (!ins.error) return
  if (ins.error.code !== '23505') throw ins.error
  let q = supabase!.from(table).update(Object.fromEntries(values.map((v) => [v, row[v]])))
  for (const k of keys) q = q.eq(k, row[k] as string)
  const upd = await q
  if (upd.error) throw upd.error
}

async function myClubId(userId: string): Promise<string> {
  const { data, error } = await supabase!.from('profiles').select('club_id').eq('id', userId).single<{ club_id: string | null }>()
  if (error || !data.club_id) throw error ?? new Error('no-club')
  return data.club_id
}
const group = <T extends { player_id: string }, U>(rows: T[], f: (r: T) => U): Record<string, U[]> => {
  const out: Record<string, U[]> = {}
  for (const r of rows) (out[r.player_id] ??= []).push(f(r))
  return out
}

export async function getDevelopment(userId: string): Promise<{ data: DevData; demo: boolean }> {
  if (!supabase) {
    const s = demoState()
    return { data: { ...s, players: await demoPlayers() }, demo: true }
  }
  const clubId = await myClubId(userId)
  const [players, status, ass, goals, logs] = await Promise.all([
    supabase.from('players').select('id, name, num, pos').eq('club_id', clubId).order('num').returns<{ id: string; name: string; num: number | null; pos: string }[]>(),
    supabase.from('player_status').select('player_id, status, note, return_on, yellow_cards, red_cards, is_demo').eq('club_id', clubId).returns<{ player_id: string; status: PlayerStatus; note: string | null; return_on: string | null; yellow_cards: number; red_cards: number; is_demo: boolean }[]>(),
    supabase.from('skill_assessments').select('player_id, assessed_on, skill, score, is_demo').eq('club_id', clubId).returns<{ player_id: string; assessed_on: string; skill: SkillId; score: number; is_demo: boolean }[]>(),
    supabase.from('dev_goals').select('id, player_id, skill, target, due_on, done_at').eq('club_id', clubId).returns<{ id: string; player_id: string; skill: SkillId; target: number; due_on: string; done_at: string | null }[]>(),
    supabase.from('training_logs').select('player_id, day, minutes, rpe, is_demo').eq('club_id', clubId).returns<{ player_id: string; day: string; minutes: number; rpe: number; is_demo: boolean }[]>(),
  ])
  for (const r of [players, status, ass, goals, logs]) if (r.error) throw r.error
  const st = new Map(status.data!.map((s) => [s.player_id, s]))
  return {
    data: {
      players: players.data!.map((p) => { const s = st.get(p.id); return { ...p, status: s?.status ?? 'fit', note: s?.note ?? null, returnOn: s?.return_on ?? null, yellow: s?.yellow_cards ?? 0, red: s?.red_cards ?? 0 } }),
      assessments: group(ass.data!, (r) => ({ day: r.assessed_on, skill: r.skill, score: r.score })),
      goals: group(goals.data!, (r) => ({ id: r.id, skill: r.skill, target: r.target, dueOn: r.due_on, done: r.done_at !== null })),
      logs: group(logs.data!, (r) => ({ day: r.day, minutes: r.minutes, rpe: r.rpe })),
    },
    demo: ass.data!.some((r) => r.is_demo) || logs.data!.some((r) => r.is_demo) || status.data!.some((s) => s.is_demo),
  }
}

const today = () => new Date().toISOString().slice(0, 10)

export async function saveAssessment(userId: string, playerId: string, scores: Partial<Record<SkillId, number>>): Promise<void> {
  const entries = Object.entries(scores).filter(([, v]) => v !== undefined) as [SkillId, number][]
  if (!supabase) {
    const s = demoState()
    const rest = (s.assessments[playerId] ?? []).filter((a) => !(a.day === today() && scores[a.skill] !== undefined))
    write({ ...s, assessments: { ...s.assessments, [playerId]: [...rest, ...entries.map(([skill, score]) => ({ day: today(), skill, score }))] } })
    return
  }
  const club_id = await myClubId(userId)
  for (const [skill, score] of entries) await insertOrAmend('skill_assessments', { player_id: playerId, club_id, assessed_on: today(), skill, score }, ['player_id', 'assessed_on', 'skill'], ['score'])
}

export async function addGoal(userId: string, playerId: string, g: { skill: SkillId; target: number; dueOn: string }): Promise<void> {
  if (!supabase) {
    const s = demoState()
    const open = (s.goals[playerId] ?? []).filter((x) => !x.done)
    if (open.length >= 3) throw new Error('goal_limit')
    write({ ...s, goals: { ...s.goals, [playerId]: [...(s.goals[playerId] ?? []), { id: `g-${Date.now()}`, skill: g.skill, target: g.target, dueOn: g.dueOn, done: false }] } })
    return
  }
  const club_id = await myClubId(userId)
  const { error } = await supabase.from('dev_goals').insert({ player_id: playerId, club_id, skill: g.skill, target: g.target, due_on: g.dueOn })
  if (error) throw error.message.includes('goal_limit') ? new Error('goal_limit') : error
}

export async function finishGoal(playerId: string, goalId: string): Promise<void> {
  if (!supabase) {
    const s = demoState()
    write({ ...s, goals: { ...s.goals, [playerId]: (s.goals[playerId] ?? []).map((x) => (x.id === goalId ? { ...x, done: true } : x)) } })
    return
  }
  const { error } = await supabase.from('dev_goals').update({ done_at: new Date().toISOString() }).eq('id', goalId)
  if (error) throw error
}

export async function removeGoal(playerId: string, goalId: string): Promise<void> {
  if (!supabase) {
    const s = demoState()
    write({ ...s, goals: { ...s.goals, [playerId]: (s.goals[playerId] ?? []).filter((x) => x.id !== goalId) } })
    return
  }
  const { error } = await supabase.from('dev_goals').delete().eq('id', goalId)
  if (error) throw error
}

export async function logSession(userId: string, playerId: string, l: Log): Promise<void> {
  if (!supabase) {
    const s = demoState()
    write({ ...s, logs: { ...s.logs, [playerId]: [...(s.logs[playerId] ?? []).filter((x) => x.day !== l.day), l] } })
    return
  }
  const club_id = await myClubId(userId)
  await insertOrAmend('training_logs', { player_id: playerId, club_id, day: l.day, minutes: l.minutes, rpe: l.rpe }, ['player_id', 'day'], ['minutes', 'rpe'])
}
