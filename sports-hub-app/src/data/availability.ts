/* Availability writes. With Supabase: player_status, updated by the club's administrators and medical staff only (RLS, column grants).
   Without it: a trial in this browser (sh.demoAvail), overlaid on the demo squad. */
import { supabase } from '../lib/supabase'
import { FIT, normalise, type Availability } from '../lib/availability'

const KEY = 'sh.demoAvail'
export const readDemoAvail = (): Record<string, Availability> => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Record<string, Availability>) : {} } catch { return {} } }
const write = (m: Record<string, Availability>) => { try { localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* session-only */ } }

export async function setAvailability(playerId: string, input: Availability): Promise<void> {
  const a = normalise(input)
  if (!supabase) { write({ ...readDemoAvail(), [playerId]: a }); return }
  const { error } = await supabase.from('player_status').update({ status: a.status, note: a.note || null, return_on: a.returnOn, yellow_cards: a.yellow, red_cards: a.red }).eq('player_id', playerId)
  if (error) throw error
}

/* For rows just added by number: the player's id is looked up inside the caller's own club (RLS). */
export async function setAvailabilityByNum(num: number, a: Availability): Promise<void> {
  if (!supabase) return setAvailability(`add-${num}`, a)
  const { data, error } = await supabase.from('players').select('id').eq('num', num).limit(1).returns<{ id: string }[]>()
  if (error) throw error
  if (data[0]) await setAvailability(data[0].id, a)
}

export const availOf = (p: { status: Availability['status']; note?: string | null; returnOn?: string | null; yellow?: number; red?: number }): Availability =>
  ({ ...FIT, status: p.status, note: p.note ?? '', returnOn: p.returnOn ?? null, yellow: p.yellow ?? 0, red: p.red ?? 0 })
