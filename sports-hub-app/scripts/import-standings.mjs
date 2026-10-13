#!/usr/bin/env node
// Replaces a league's table (demo or previous import) with the one in a CSV: the file is the whole table.
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/import-standings.mjs <league-id> <file.csv> --source "اسم المصدر" [--create-clubs] [--apply]
// Without --apply it only checks the file and prints the plan. The service-role key stays on your machine:
// never put it in .env (VITE_* variables are shipped to every visitor's browser).
import { readFileSync } from 'node:fs'
import { parseStandings } from './standings-csv.mjs'

const args = process.argv.slice(2)
const flag = (n) => args.includes(n)
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const [leagueId, file] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--source')
const source = opt('--source')
const apply = flag('--apply')
const base = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const die = (m) => { console.error('✗ ' + m); process.exit(1) }
if (!leagueId || !file || !source) die('الاستخدام: import-standings.mjs <league-id> <file.csv> --source "المصدر" [--create-clubs] [--apply]')
if (!base || !key) die('ناقص SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY (من Project Settings → API، ولا تحطهم بملف .env)')

const { rows, errors } = parseStandings(readFileSync(file, 'utf8'))
if (errors.length) { errors.forEach((e) => console.error('✗ ' + e)); die(`الملف فيه ${errors.length} خطأ، ما انكتب شي`) }

const api = async (path, init = {}) => {
  const r = await fetch(`${base}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers } })
  if (!r.ok) die(`${init.method ?? 'GET'} ${path.split('?')[0]} → ${r.status} ${await r.text()}`)
  const body = await r.text() // writes answer with an empty body unless asked to return rows
  return body ? JSON.parse(body) : null
}

const league = await api(`leagues?id=eq.${encodeURIComponent(leagueId)}&select=id,name`)
if (!league.length) die(`ما فيه دوري برقم «${leagueId}»`)
const clubs = await api('clubs?select=id,name')
const byName = new Map(clubs.map((c) => [c.name, c.id]))
const unknown = rows.filter((r) => !byName.has(r.team)).map((r) => r.team)
const existing = await api(`league_entries?league_id=eq.${leagueId}&select=club_id,is_demo`)

console.log(`دوري: ${league[0].name} · ${rows.length} نادي · المصدر: ${source}`)
const incoming = new Set(rows.map((r) => byName.get(r.team)).filter(Boolean))
const stale = existing.filter((e) => !incoming.has(e.club_id)).length
console.log(`يكتب ${rows.length} صف حقيقي (يستبدل التجريبي والقديم)، ويحذف ${stale} صف ما عاد له وجود بالملف.`)
if (unknown.length) console.log(`أندية جديدة (${unknown.length}): ${unknown.join('، ')}${flag('--create-clubs') ? '' : '  ← أضف --create-clubs أو صحّح الأسماء'}`)
if (unknown.length && !flag('--create-clubs')) die('أسماء أندية ما تطابق اللي بالقاعدة: اتأكد من الإملاء قبل ما ننشئ أندية مكررة')
if (!apply) { console.log('\nتجربة فقط. أضف --apply للكتابة.'); process.exit(0) }

if (unknown.length) {
  const made = await api('clubs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(unknown.map((name) => ({ name }))) })
  made.forEach((c) => byName.set(c.name, c.id))
}
await api('league_entries?on_conflict=league_id,club_id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify(rows.map(({ team, ...r }) => ({ league_id: leagueId, club_id: byName.get(team), ...r, is_demo: false, source, updated_at: new Date().toISOString() }))),
})
// The file is the whole table: anything not in it (demo rows, a club that was renamed) goes.
await api(`league_entries?league_id=eq.${leagueId}&club_id=not.in.(${rows.map((r) => byName.get(r.team)).join(',')})`, { method: 'DELETE' })
console.log(`✓ انكتب ${rows.length} صف. التطبيق يبيّن «آخر تحديث» و«المصدر» الحين.`)
