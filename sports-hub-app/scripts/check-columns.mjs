/* Drift check: every column the app names in a PostgREST query (.from(t).select/eq/order/gte/lte/is/in/like) must exist in the migrations.
   The Supabase client is untyped here (queries use .returns<>()), so a renamed column would otherwise fail only against a real project. */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const sql = readdirSync(join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(join(root, 'supabase/migrations', f), 'utf8')).join('\n')
const tables = {}
for (const m of sql.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)) {
  const cols = new Set()
  for (const line of m[2].split('\n')) { const c = line.match(/^ {2}([a-z_]+)\s+\S/); if (c && !['primary', 'foreign', 'unique', 'check', 'constraint'].includes(c[1])) cols.add(c[1]) }
  tables[m[1]] = cols
}
for (const m of sql.matchAll(/alter table public\.(\w+)\s+add column (\w+)(?:[^;]*?,\s*add column (\w+))*/g)) { tables[m[1]]?.add(m[2]); if (m[3]) tables[m[1]]?.add(m[3]) }
for (const m of sql.matchAll(/alter table public\.(\w+) add column (\w+)/g)) tables[m[1]]?.add(m[2])
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [join(d, e.name)] : []))
const topLevel = (list) => { const out = []; let depth = 0, cur = ''; for (const ch of list) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch } if (cur.trim()) out.push(cur); return out.map((x) => x.trim()).filter(Boolean) }
const problems = []; let checked = 0
for (const file of walk(join(root, 'src'))) {
  const src = readFileSync(file, 'utf8')
  const parts = src.split(/(?=\.from\(')/)
  for (const part of parts.slice(1)) {
    const t = part.match(/^\.from\('(\w+)'\)/)?.[1]; if (!t) continue
    if (!tables[t]) { if (!['profiles'].includes(t)) problems.push(`${file}: unknown table ${t}`); if (!tables[t]) continue }
    const chunk = part.slice(0, 700).split(/\n\s*\n|\.rpc\(/)[0]
    const names = []
    for (const m of chunk.matchAll(/\.select\('([^']*)'/g)) for (const c of topLevel(m[1])) { if (c.includes('(') || c === '*') continue; names.push(c.replace(/^\w+:/, '').replace(/!\w+$/, '')) }
    for (const m of chunk.matchAll(/\.(?:eq|neq|gte|lte|gt|lt|is|in|like|order|maybeSingle)\('(\w+)'/g)) names.push(m[1])
    for (const c of names) { checked++; if (!tables[t].has(c)) problems.push(`${file.replace(root, '')}: .from('${t}') uses column "${c}" which the migrations do not define`) }
  }
}
if (problems.length) { console.error('COLUMN DRIFT:\n' + problems.join('\n')); process.exit(1) }
console.log(`ok: ${checked} column references across ${Object.keys(tables).length} tables match the migrations`)
