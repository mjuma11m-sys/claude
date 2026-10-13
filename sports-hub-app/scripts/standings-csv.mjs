// Parses and checks a league table CSV before anything touches the database.
//   team,played,won,drawn,lost,gf,ga        (header required, any column order)
const COLS = ['team', 'played', 'won', 'drawn', 'lost', 'gf', 'ga']

function splitLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

export function parseStandings(text) {
  const errors = []
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], errors: ['الملف فاضي أو فيه سطر العناوين بس'] }
  const head = splitLine(lines[0]).map((h) => h.toLowerCase())
  const missing = COLS.filter((c) => !head.includes(c))
  if (missing.length) return { rows: [], errors: [`أعمدة ناقصة: ${missing.join(', ')}`] }

  const rows = []
  const seen = new Set()
  lines.slice(1).forEach((line, i) => {
    const at = `سطر ${i + 2}`
    const cells = splitLine(line)
    const rec = Object.fromEntries(head.map((h, k) => [h, cells[k]]))
    const team = (rec.team ?? '').replace(/\s+/g, ' ').trim()
    if (!team) return errors.push(`${at}: اسم النادي فاضي`)
    if (seen.has(team)) errors.push(`${at}: «${team}» مكرر`)
    seen.add(team)
    const n = {}
    for (const c of COLS.slice(1)) {
      const v = Number(rec[c])
      if (!Number.isInteger(v) || v < 0 || v > 999) errors.push(`${at} (${team}): «${c}» لازم رقم صحيح بين 0 و999 (جاء «${rec[c]}»)`)
      n[c] = v
    }
    if (COLS.slice(1).every((c) => Number.isInteger(n[c])) && n.played !== n.won + n.drawn + n.lost)
      errors.push(`${at} (${team}): لعب ${n.played} ≠ فاز ${n.won} + تعادل ${n.drawn} + خسر ${n.lost}`)
    rows.push({ team, ...n })
  })

  // A full table is closed: every win is someone's loss, every goal scored is a goal conceded, draws come in pairs.
  if (!errors.length) {
    const sum = (k) => rows.reduce((a, r) => a + r[k], 0)
    if (sum('won') !== sum('lost')) errors.push(`مجموع الفوز (${sum('won')}) لازم يساوي مجموع الخسارة (${sum('lost')}): ناقص نادي أو رقم غلط`)
    if (sum('gf') !== sum('ga')) errors.push(`مجموع الأهداف له (${sum('gf')}) لازم يساوي مجموع الأهداف عليه (${sum('ga')})`)
    if (sum('drawn') % 2) errors.push(`مجموع التعادلات (${sum('drawn')}) لازم يكون زوجي`)
  }
  return { rows, errors }
}
