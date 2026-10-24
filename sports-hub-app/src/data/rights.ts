/* Player requests and the pay ledger. With Supabase: RLS tables written only through RPCs (migration 0012). Without it: a sandbox in this browser,
   seeded with fictional requests and a fictional pay month. The deadline and grace numbers come from public.rules (demo values). */
import { supabase } from '../lib/supabase'
import { DEFAULT_GRACE_DAYS, DEFAULT_REQUEST_DAYS, dueOn, isoDay, lastMonths, type Request, type RKind } from '../lib/rights'
import { getAttendance } from './attendance'
import { getDevelopment } from './development'
import { getClubRoom } from './source'

export type RightsData = { requests: Request[]; paid: Record<string, Record<string, string>>; requestDays: number; graceDays: number; removed: string[] }
export type ActResult = { ok: true; id?: string } | { ok: false; errors: { field: string; code: string; row?: number }[] }
export type PlayerExport = Record<string, unknown>

const KEY = 'sh.demoRights'
const read = (): RightsData | null => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as RightsData) : null } catch { return null } }
const write = (s: RightsData) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* session-only */ } }
const back = (n: number) => isoDay(Date.now() - n * 86_400_000)
const fail = (code: string, field = 'request'): ActResult => ({ ok: false, errors: [{ field, code }] })

/* Two open requests (one close to its deadline) and last month paid for everyone except player 11. */
function seed(): RightsData {
  const mk = (id: string, playerId: string, n: number, kind: RKind, ago: number): Request =>
    ({ id, playerId, consentRef: `DEMO-${n}`, kind, receivedOn: back(ago), dueOn: dueOn(back(ago)), status: 'open', closedOn: null, exportedAt: null })
  const [, prev] = lastMonths(2)
  const paid: Record<string, string> = {}
  for (const n of [1, 22, 2, 3, 4, 5, 6, 8, 10, 14, 7, 9, 17, 19, 21]) paid[`demo-${n}`] = prev.slice(0, 8) + '03'
  return { requests: [mk('q1', 'demo-8', 8, 'access', 4), mk('q2', 'demo-3', 3, 'correct', 26)], paid: { [prev]: paid }, requestDays: DEFAULT_REQUEST_DAYS, graceDays: DEFAULT_GRACE_DAYS, removed: [] }
}
const store = () => read() ?? seed()

async function myClubId(userId: string): Promise<string> {
  const { data, error } = await supabase!.from('profiles').select('club_id').eq('id', userId).single<{ club_id: string | null }>()
  if (error || !data.club_id) throw error ?? new Error('no-club')
  return data.club_id
}

export async function getRights(userId: string): Promise<RightsData> {
  if (!supabase) return store()
  const clubId = await myClubId(userId)
  const [rq, wp, rules] = await Promise.all([
    supabase.from('player_requests').select('id, player_id, consent_ref, kind, received_on, due_on, status, closed_on, exported_at').eq('club_id', clubId).order('received_on', { ascending: false }).limit(200)
      .returns<{ id: string; player_id: string | null; consent_ref: string; kind: RKind; received_on: string; due_on: string; status: 'open' | 'done'; closed_on: string | null; exported_at: string | null }[]>(),
    supabase.from('wage_payments').select('player_id, month, paid_on').eq('club_id', clubId).gte('month', lastMonths(7).at(-1)!).returns<{ player_id: string; month: string; paid_on: string }[]>(),
    supabase.from('rules').select('key, value').in('key', ['rights_request_days', 'wage_late_grace_days']).returns<{ key: string; value: number }[]>(),
  ])
  for (const r of [rq, wp, rules]) if (r.error) throw r.error
  const rule = (k: string, d: number) => Number(rules.data!.find((x) => x.key === k)?.value ?? d)
  const paid: RightsData['paid'] = {}
  for (const p of wp.data!) (paid[p.month] ??= {})[p.player_id] = p.paid_on
  return {
    requests: rq.data!.map((r) => ({ id: r.id, playerId: r.player_id, consentRef: r.consent_ref, kind: r.kind, receivedOn: r.received_on, dueOn: r.due_on, status: r.status, closedOn: r.closed_on, exportedAt: r.exported_at })),
    paid, requestDays: rule('rights_request_days', DEFAULT_REQUEST_DAYS), graceDays: rule('wage_late_grace_days', DEFAULT_GRACE_DAYS), removed: [],
  }
}

export async function logRequest(player: { id: string; num: number | null }, kind: RKind, receivedOn: string): Promise<ActResult> {
  if (!supabase) {
    const s = store()
    if (receivedOn > back(0) || receivedOn < back(365)) return fail('bad_date', 'received_on')
    if (s.requests.some((r) => r.playerId === player.id && r.kind === kind && r.status === 'open')) return fail('already_open', 'kind')
    const id = `q-${Date.now()}`
    write({ ...s, requests: [...s.requests, { id, playerId: player.id, consentRef: `DEMO-${player.num ?? 0}`, kind, receivedOn, dueOn: dueOn(receivedOn, s.requestDays), status: 'open', closedOn: null, exportedAt: null }] })
    return { ok: true, id }
  }
  const { data, error } = await supabase.rpc('log_player_request', { p_player: player.id, p_kind: kind, p_received_on: receivedOn })
  if (error) throw error
  return data as ActResult
}

export async function closeRequest(id: string): Promise<ActResult> {
  if (!supabase) {
    const s = store(); const r = s.requests.find((x) => x.id === id)
    if (!r) throw new Error('not_found')
    if (r.status === 'done') return fail('already_closed')
    if (r.kind === 'withdraw') return fail('use_withdrawal')
    if (r.kind === 'access' && !r.exportedAt) return fail('export_first')
    write({ ...s, requests: s.requests.map((x) => (x.id === id ? { ...x, status: 'done', closedOn: back(0) } : x)) })
    return { ok: true }
  }
  const { data, error } = await supabase.rpc('close_player_request', { p_request: id })
  if (error) throw error
  return data as ActResult
}

/* The player leaves; the request stays, finished, with the consent reference and no link to the person. */
export async function fulfilWithdrawal(id: string): Promise<void> {
  if (!supabase) {
    const s = store(); const r = s.requests.find((x) => x.id === id && x.status === 'open' && x.kind === 'withdraw')
    if (!r || !r.playerId) throw new Error('not_found')
    write({ ...s, removed: [...s.removed, r.playerId], paid: Object.fromEntries(Object.entries(s.paid).map(([m, p]) => [m, Object.fromEntries(Object.entries(p).filter(([pid]) => pid !== r.playerId))])),
      requests: s.requests.map((x) => (x.playerId === r.playerId && x.status === 'open' ? { ...x, status: 'done' as const, closedOn: back(0), playerId: null } : x.playerId === r.playerId ? { ...x, playerId: null } : x)) })
    return
  }
  const { error } = await supabase.rpc('fulfil_withdrawal', { p_request: id })
  if (error) throw error
}

/* Everything the app holds about one player. Built in the browser sandbox from the sandbox screens; with Supabase it is one RPC. Never stored. */
export async function exportPlayer(userId: string, playerId: string, requestId?: string): Promise<PlayerExport> {
  if (!supabase) {
    const s = store()
    if (requestId) write({ ...s, requests: s.requests.map((x) => (x.id === requestId && x.playerId === playerId && x.kind === 'access' && x.status === 'open' ? { ...x, exportedAt: new Date().toISOString() } : x)) })
    const [room, att, dev] = await Promise.all([getClubRoom(userId), getAttendance(userId), getDevelopment(userId)])
    const p = room.data.squad.find((x) => x.id === playerId)
    if (!p) throw new Error('not_found')
    return {
      exported_on: back(0), demo: true,
      player: { name: p.name, number: p.num, position: p.pos },
      contract: [{ ends_on: p.endsOn, monthly_wage_bhd: p.wage }],
      status: { status: p.status },
      attendance: att.filter((a) => a.marks[playerId]).map((a) => ({ day: a.day, kind: a.kind, ...a.marks[playerId] })),
      assessments: dev.data.assessments[playerId] ?? [], goals: dev.data.goals[playerId] ?? [], training_load: dev.data.logs[playerId] ?? [],
      pay_ledger: Object.entries(s.paid).flatMap(([month, m]) => (m[playerId] ? [{ month, paid_on: m[playerId] }] : [])),
    }
  }
  const { data, error } = await supabase.rpc('player_data_export', { p_player: playerId, p_request: requestId ?? null })
  if (error) throw error
  return data as PlayerExport
}

export async function saveWageMonth(month: string, paid: Record<string, string | null>): Promise<ActResult> {
  if (!supabase) {
    const s = store()
    const today = back(0)
    for (const v of Object.values(paid)) if (v && (v > today || v < isoDay(Date.parse(month + 'T00:00:00Z') - 31 * 86_400_000))) return fail('bad_date', 'paid_on')
    const cur = { ...(s.paid[month] ?? {}) }
    for (const [id, v] of Object.entries(paid)) { if (v) cur[id] = v; else delete cur[id] }
    write({ ...s, paid: { ...s.paid, [month]: cur } })
    return { ok: true }
  }
  const { data, error } = await supabase.rpc('save_wage_month', { p_month: month, p_paid: Object.entries(paid).map(([player_id, paid_on]) => ({ player_id, paid_on })) })
  if (error) throw error
  return data as ActResult
}
