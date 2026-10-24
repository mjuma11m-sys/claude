/* Data center: the club's agreement, the squad import and consent withdrawal.
   With Supabase these are rows and RPCs guarded by RLS (migration 0007). Without it, a sandbox in this browser only:
   same checks, labelled as a trial, never mixed with real data. */
import { supabase } from '../lib/supabase'
import { DEMO_SQUAD } from './demo'
import type { CsvError, ImportRow } from '../lib/squad-csv'

export type Agreement = { reference: string; signatory: string; title: string; signedOn: string; version: string }
export type DataCenter = { connected: boolean; agreement: Agreement | null; players: number; real: boolean; withdrawals: number }
export type AgreementInput = Agreement
export type ImportResult = { ok: true; players: number } | { ok: false; errors: CsvError[] }

export const AGREEMENT_VERSION = 'dpa-draft-1'
export const DEMO_AGREEMENT_KEY = 'sh.demoAgreement'
export const DEMO_IMPORT_KEY = 'sh.demoImport'
export const DEMO_ROSTER_KEY = 'sh.demoRoster'

const read = <T>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null } catch { return null } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* session-only */ } }
const drop = (k: string) => { try { localStorage.removeItem(k) } catch { /* nothing to remove */ } }

export type AddRow = { num: number; name: string; pos: string }
export const readDemoRoster = (): AddRow[] => read<AddRow[]>(DEMO_ROSTER_KEY) ?? []
export const readDemoImport = (): ImportRow[] | null => read<ImportRow[]>(DEMO_IMPORT_KEY)

async function myClubId(userId: string): Promise<string> {
  const { data, error } = await supabase!.from('profiles').select('club_id').eq('id', userId).single<{ club_id: string | null }>()
  if (error || !data.club_id) throw error ?? new Error('no-club')
  return data.club_id
}

export async function getDataCenter(userId: string): Promise<DataCenter> {
  if (!supabase) {
    const rows = readDemoImport()
    return { connected: false, agreement: read<Agreement>(DEMO_AGREEMENT_KEY), players: rows?.length ?? 0, real: false, withdrawals: 0 }
  }
  const clubId = await myClubId(userId)
  const [ag, consents, real, wd] = await Promise.all([
    supabase.from('data_agreements').select('reference, signatory_name, signatory_title, signed_on, version').eq('club_id', clubId).is('revoked_at', null).maybeSingle<{ reference: string; signatory_name: string; signatory_title: string; signed_on: string; version: string }>(),
    supabase.from('player_consents').select('player_id', { count: 'exact', head: true }).eq('club_id', clubId),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('is_demo', false),
    supabase.from('consent_withdrawals').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
  ])
  for (const r of [ag, consents, real, wd]) if (r.error) throw r.error
  const a = ag.data
  return {
    connected: true,
    agreement: a ? { reference: a.reference, signatory: a.signatory_name, title: a.signatory_title, signedOn: a.signed_on, version: a.version } : null,
    players: consents.count ?? 0, real: (real.count ?? 0) > 0, withdrawals: wd.count ?? 0,
  }
}

/* Recording the agreement is the club's statement that a signed copy exists. The app stores who signed and the document reference, never the document. */
export async function recordAgreement(userId: string, a: AgreementInput): Promise<void> {
  if (!supabase) return write(DEMO_AGREEMENT_KEY, a)
  const club_id = await myClubId(userId)
  const { error } = await supabase.from('data_agreements').insert({ club_id, version: a.version, signatory_name: a.signatory, signatory_title: a.title, reference: a.reference, signed_on: a.signedOn })
  if (error) throw error
}

export async function revokeAgreement(userId: string): Promise<void> {
  if (!supabase) { drop(DEMO_AGREEMENT_KEY); drop(DEMO_IMPORT_KEY); return }
  const club_id = await myClubId(userId)
  const { error } = await supabase.from('data_agreements').update({ revoked_at: new Date().toISOString() }).eq('club_id', club_id).is('revoked_at', null)
  if (error) throw error
}

export async function importSquad(rows: ImportRow[]): Promise<ImportResult> {
  if (!supabase) {
    if (!read(DEMO_AGREEMENT_KEY)) throw new Error('dpa_required')
    write(DEMO_IMPORT_KEY, rows)
    return { ok: true, players: rows.length }
  }
  const { data, error } = await supabase.rpc('import_squad', { p_rows: rows })
  if (error) throw error
  return data as ImportResult
}

/* Adds players (number, name, position) to the squad without replacing it. The same locks as the import: the agreement, a consent reference the club wrote, every row checked. */
export async function addPlayers(rows: AddRow[], consentRef: string): Promise<ImportResult> {
  const ref = consentRef.trim()
  if (!supabase) {
    if (!read(DEMO_AGREEMENT_KEY)) throw new Error('dpa_required')
    if (ref.length < 3 || ref.length > 60) return { ok: false, errors: [{ row: 0, field: 'consent_ref', code: 'consent_required' }] }
    const have = readDemoRoster()
    const taken = new Set([...(readDemoImport() ?? DEMO_SQUAD).map((p) => p.num), ...have.map((p) => p.num)])
    const errors: CsvError[] = []
    rows.forEach((r, i) => { if (taken.has(r.num)) errors.push({ row: i + 1, field: 'num', code: 'duplicate_number' }); taken.add(r.num) })
    if (errors.length) return { ok: false, errors }
    if (rows.length === 0 || taken.size > 60) return { ok: false, errors: [{ row: 0, field: 'rows', code: 'bad_row_count' }] }
    write(DEMO_ROSTER_KEY, [...have, ...rows])
    return { ok: true, players: rows.length }
  }
  const { data, error } = await supabase.rpc('add_players', { p_rows: rows, p_consent_ref: ref })
  if (error) throw error
  return data as ImportResult
}

export async function withdrawConsent(playerId: string): Promise<void> {
  if (!supabase) {
    const rows = readDemoImport() ?? []
    write(DEMO_IMPORT_KEY, rows.filter((r) => `imp-${r.num}` !== playerId))
    write(DEMO_ROSTER_KEY, readDemoRoster().filter((r) => `add-${r.num}` !== playerId))
    return
  }
  const { error } = await supabase.rpc('withdraw_consent', { p_player: playerId })
  if (error) throw error
}
