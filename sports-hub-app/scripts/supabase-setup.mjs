// One command from an empty Supabase project to a working app:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx npm run setup:supabase -- <project-ref> [--demo] [--dry-run] [--force]
// It (1) reads the project's PUBLIC anon key, (2) applies supabase/migrations in order, once each, (3) optionally loads the demo seed,
// (4) writes .env.local with the URL and the anon key, (5) checks the API answers.
// The access token is your personal Supabase token, used on this machine only. The service_role key is never read or written.
// NOTE: written against the documented Management API (GET /v1/projects/{ref}/api-keys, POST /v1/projects/{ref}/database/query).
// Tested against a stand-in server, not against a live project: watch the first run on yours.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const sqlString = (s) => `'${s.replaceAll("'", "''")}'`

export async function setup({ ref, token, api = 'https://api.supabase.com', restUrl, demo = false, dryRun = false, force = false, envFile = join(root, '.env.local'), migrationsDir = join(root, 'supabase', 'migrations'), seedFile = join(root, 'supabase', 'seed_demo.sql'), fetchImpl = fetch, log = console.log }) {
  if (!/^[a-z0-9]{12,40}$/.test(ref ?? '')) throw new Error('project ref looks wrong: it is the 20-letter id in your project URL (https://<ref>.supabase.co)')
  if (!token) throw new Error('set SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access Tokens). It stays on this machine.')
  const url = restUrl ?? `https://${ref}.supabase.co`
  const call = async (path, init = {}) => {
    const res = await fetchImpl(`${api}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers } })
    if (res.status === 401 || res.status === 403) throw new Error(`Supabase refused the token (${res.status}). Check SUPABASE_ACCESS_TOKEN and that it can access project ${ref}.`)
    if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed: ${res.status} ${(await res.text()).slice(0, 300)}`)
    return res.json()
  }
  const query = (sql) => call(`/v1/projects/${ref}/database/query`, { method: 'POST', body: JSON.stringify({ query: sql }) })

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  if (dryRun) {
    log(`dry run for project ${ref}:`)
    files.forEach((f) => log(`  would apply ${f} (if not applied yet)`))
    if (demo) log('  would load seed_demo.sql (fictional clubs and demo data)')
    log(`  would write ${envFile} with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY`)
    return { dryRun: true, files }
  }

  const keys = await call(`/v1/projects/${ref}/api-keys`)
  const anon = (Array.isArray(keys) ? keys : []).find((k) => k.name === 'anon')?.api_key
  if (!anon) throw new Error('no anon key found for this project (the response had no key named "anon")')
  log('✓ read the public anon key')

  // Bookkeeping table: closed to the API (RLS on, no grants), so nothing outside this script can read or write it.
  await query(`create table if not exists public.sh_migrations (name text primary key, applied_at timestamptz not null default now());
    alter table public.sh_migrations enable row level security; revoke all on public.sh_migrations from anon, authenticated;`)
  const done = new Set((await query('select name from public.sh_migrations')).map((r) => r.name))
  const applied = []
  for (const f of files) {
    if (done.has(f)) { log(`· ${f} already applied`); continue }
    await query(`${readFileSync(join(migrationsDir, f), 'utf8')}\n;insert into public.sh_migrations (name) values (${sqlString(f)});`)
    applied.push(f); log(`✓ applied ${f}`)
  }
  if (demo) { await query(readFileSync(seedFile, 'utf8')); log('✓ loaded the demo seed (fictional clubs: never use it on a project that holds real data)') }

  // .env.local: replace our two keys, keep everything else, never write a service_role key.
  const keep = existsSync(envFile) ? readFileSync(envFile, 'utf8').split('\n').filter((l) => l && !/^VITE_SUPABASE_(URL|ANON_KEY)=/.test(l)) : []
  const had = existsSync(envFile) && readFileSync(envFile, 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)
  if (had && had[1] !== url && !force) throw new Error(`${envFile} already points at ${had[1]}. Re-run with --force to replace it.`)
  writeFileSync(envFile, [...keep, `VITE_SUPABASE_URL=${url}`, `VITE_SUPABASE_ANON_KEY=${anon}`, ''].join('\n'))
  log(`✓ wrote ${envFile}`)

  const probe = await fetchImpl(`${url}/rest/v1/leagues?select=id&limit=1`, { headers: { apikey: anon, authorization: `Bearer ${anon}` } })
  if (!probe.ok) throw new Error(`the API did not answer as expected (${probe.status}). The migrations ran, but check the project URL and that the API is enabled.`)
  log('✓ the API answers with the anon key')
  log('\nNext: sign in once through the app, then give that account its role and club (SQL editor):\n  update public.profiles set role = \'club_admin\', club_id = (select id from public.clubs where name = \'<club name>\') where id = \'<user id>\';')
  return { applied, anon: undefined, url }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const ref = args.find((a) => !a.startsWith('--'))
  setup({ ref, token: process.env.SUPABASE_ACCESS_TOKEN, api: process.env.SUPABASE_API, demo: args.includes('--demo'), dryRun: args.includes('--dry-run'), force: args.includes('--force') })
    .catch((e) => { console.error('✗ ' + e.message); process.exit(1) })
}
