import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setup } from './supabase-setup.mjs'

const REF = 'abcdefghijklmnopqrst'
const dir = mkdtempSync(join(tmpdir(), 'shsetup-'))
const mig = join(dir, 'migrations'); await import('node:fs').then((fs) => fs.mkdirSync(mig))
writeFileSync(join(mig, '0001_a.sql'), 'create table a();')
writeFileSync(join(mig, '0002_b.sql'), "create table b(); -- it's fine")
writeFileSync(join(dir, 'seed.sql'), 'insert into a default values;')

// A stand-in for the two Management API endpoints and the project REST API, recording every call.
function fake({ applied = [], tokenOk = true, restOk = true } = {}) {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null
    calls.push({ url, method: init.method ?? 'GET', auth: init.headers?.authorization, sql: body?.query })
    const json = (v, status = 200) => ({ ok: status < 400, status, json: async () => v, text: async () => JSON.stringify(v) })
    if (!tokenOk && url.includes('/v1/')) return json({}, 401)
    if (url.endsWith('/api-keys')) return json([{ name: 'anon', api_key: 'ANON.KEY' }, { name: 'service_role', api_key: 'SECRET.SERVICE' }])
    if (url.endsWith('/database/query')) return json(body.query.startsWith('select name from public.sh_migrations') ? applied.map((name) => ({ name })) : [])
    if (url.includes('/rest/v1/leagues')) return json([], restOk ? 200 : 500)
    return json({}, 404)
  }
  return { fetchImpl, calls }
}
const base = (o = {}) => ({ ref: REF, token: 'sbp_test', migrationsDir: mig, seedFile: join(dir, 'seed.sql'), envFile: join(dir, `.env.${Math.random()}`), log: () => {}, ...o })

describe('supabase setup script', () => {
  it('applies each migration once, writes .env.local with the anon key only, and probes the API', async () => {
    const f = fake(); const o = base({ fetchImpl: f.fetchImpl })
    const r = await setup(o)
    expect(r.applied).toEqual(['0001_a.sql', '0002_b.sql'])
    const env = readFileSync(o.envFile, 'utf8')
    expect(env).toContain(`VITE_SUPABASE_URL=https://${REF}.supabase.co`)
    expect(env).toContain('VITE_SUPABASE_ANON_KEY=ANON.KEY')
    expect(env).not.toContain('SECRET.SERVICE')
    expect(env).not.toContain('sbp_test')
    expect(f.calls.every((c) => !c.url.includes('/v1/projects') || c.auth === 'Bearer sbp_test')).toBe(true)
    expect(f.calls.some((c) => c.url.includes('/rest/v1/leagues'))).toBe(true)
    // the apostrophe in a comment must not break the bookkeeping insert (names are escaped)
    expect(f.calls.find((c) => c.sql?.includes('0002_b.sql')).sql).toMatch(/insert into public\.sh_migrations \(name\) values \('0002_b\.sql'\)/)
  })
  it('is safe to run twice: applied migrations are skipped', async () => {
    const f = fake({ applied: ['0001_a.sql', '0002_b.sql'] })
    const r = await setup(base({ fetchImpl: f.fetchImpl }))
    expect(r.applied).toEqual([])
    expect(f.calls.filter((c) => c.sql?.includes('create table a()'))).toHaveLength(0)
  })
  it('loads the demo seed only when asked', async () => {
    const a = fake(); await setup(base({ fetchImpl: a.fetchImpl }))
    expect(a.calls.some((c) => c.sql === 'insert into a default values;')).toBe(false)
    const b = fake(); await setup(base({ fetchImpl: b.fetchImpl, demo: true }))
    expect(b.calls.some((c) => c.sql === 'insert into a default values;')).toBe(true)
  })
  it('a dry run changes and calls nothing', async () => {
    const f = fake(); const o = base({ fetchImpl: f.fetchImpl, dryRun: true })
    const r = await setup(o)
    expect(r.dryRun).toBe(true)
    expect(f.calls).toHaveLength(0)
    expect(() => readFileSync(o.envFile)).toThrow()
  })
  it('stops with a clear message on a refused token, a bad ref, no token, or a failing API probe', async () => {
    await expect(setup(base({ fetchImpl: fake({ tokenOk: false }).fetchImpl }))).rejects.toThrow(/refused the token/)
    await expect(setup(base({ ref: 'x', fetchImpl: fake().fetchImpl }))).rejects.toThrow(/ref looks wrong/)
    await expect(setup(base({ token: '', fetchImpl: fake().fetchImpl }))).rejects.toThrow(/SUPABASE_ACCESS_TOKEN/)
    await expect(setup(base({ fetchImpl: fake({ restOk: false }).fetchImpl }))).rejects.toThrow(/did not answer/)
  })
  it('does not silently repoint an .env.local that targets another project, and keeps unrelated lines', async () => {
    const envFile = join(dir, '.env.keep')
    writeFileSync(envFile, 'VITE_PRIVACY_CONTACT=a@b.c\nVITE_SUPABASE_URL=https://other.supabase.co\nVITE_SUPABASE_ANON_KEY=old\n')
    await expect(setup(base({ envFile, fetchImpl: fake().fetchImpl }))).rejects.toThrow(/--force/)
    await setup(base({ envFile, force: true, fetchImpl: fake().fetchImpl }))
    const env = readFileSync(envFile, 'utf8')
    expect(env).toContain('VITE_PRIVACY_CONTACT=a@b.c')
    expect(env).toContain(`https://${REF}.supabase.co`)
    expect(env).not.toContain('other.supabase.co')
  })
})
