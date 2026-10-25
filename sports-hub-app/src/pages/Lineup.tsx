import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { DemoNote } from '../components/DemoNote'
import { AvailabilityPanel } from '../components/AvailabilityPanel'
import { Icon } from '../components/Icon'
import { MatchCard } from '../components/MatchCard'
import { PageTitle } from '../components/PageTitle'
import { Segmented } from '../components/Segmented'
import { Failed, Loading } from '../components/States'
import { getDevelopment, type DevPlayer } from '../data/development'
import { deleteLineup, getLineups, saveLineup, type SavedLineup } from '../data/lineup'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import { latestScores, loadFromLogs, nextSaturday, skillsFor } from '../lib/development'
import { fmtDate } from '../lib/format'
import { canSave, FIT_TEXT, fitOf, FORMATION_SLOTS, FORMATIONS, lineupText, MAX_BENCH, reshape, roleOf, suggestLineup, validateLineup, type Formation, type Lineup } from '../lib/lineup'
import { STATUS } from '../lib/squad'

const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'
const btn = 'min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink disabled:opacity-60'
const ghost = 'min-h-11 rounded-xl border border-white/15 px-4 text-sm'
type Target = { kind: 'start'; slot: number } | { kind: 'bench' } | null
const short = (name: string) => (name.length > 9 ? name.slice(0, 8) + '…' : name)
const lastName = (name: string) => short(name.split(' ').slice(-1)[0] || name)

function Pitch({ formation, starters, by, target, onPick }: { formation: Formation; starters: Record<number, string>; by: Map<string, DevPlayer>; target: Target; onPick: (slot: number) => void }) {
  return (
    <div className="turf relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl border border-white/10" role="group" aria-label="الملعب">
      <svg aria-hidden viewBox="0 0 100 133" preserveAspectRatio="none" className="absolute inset-0 size-full text-white/20" fill="none" stroke="currentColor" strokeWidth="0.5">
        <rect x="3" y="3" width="94" height="127" /><path d="M3 66.5h94" /><circle cx="50" cy="66.5" r="11" />
        <rect x="26" y="3" width="48" height="18" /><rect x="38" y="3" width="24" height="7" />
        <rect x="26" y="112" width="48" height="18" /><rect x="38" y="123" width="24" height="7" />
      </svg>
      {FORMATION_SLOTS[formation].map((d, i) => {
        const p = by.get(starters[d.slot])
        const active = target?.kind === 'start' && target.slot === d.slot
        return (
          <button key={`${formation}-${d.slot}`} type="button" onClick={() => onPick(d.slot)} aria-label={`${d.label}: ${p ? p.name : 'فاضي'}`} aria-pressed={active}
            className={`absolute grid min-h-11 w-16 -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5 text-center ${p ? 'kick' : ''}`} style={{ left: `${d.x}%`, top: `${d.y}%`, ...vars({ '--i': i }) }}>
            <span className={`grid size-11 place-items-center rounded-full border-2 font-display text-xl leading-none ${active ? 'border-pulse bg-pulse/30 text-pulse' : p ? (p.status === 'doubtful' ? 'border-warn bg-night/80' : 'border-white/70 bg-night/80') : 'border-dashed border-white/40 bg-white/5 text-white/70'}`}>
              {p ? <span className="num">{p.num ?? '—'}</span> : '+'}
            </span>
            <span className="max-w-full truncate rounded bg-night/70 px-1 text-[11px] leading-tight text-ink">{p ? lastName(p.name) : d.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Lineup() {
  const { user } = useAuth()
  const load = useLoad(async () => ({ dev: await getDevelopment(user!.id), saved: await getLineups(user!.id) }), [user?.id])
  const [formation, setFormation] = useState<Formation>('4-3-3')
  const [starters, setStarters] = useState<Record<number, string>>({})
  const [bench, setBench] = useState<string[]>([])
  const [target, setTarget] = useState<Target>(null)
  const [matchOn, setMatchOn] = useState(() => { try { return localStorage.getItem('sh.nextMatch') || nextSaturday() } catch { return nextSaturday() } })
  const [opponent, setOpponent] = useState('')
  const [notes, setNotes] = useState<string[]>([])
  const [why, setWhy] = useState<Record<string, string[]>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const dev = load.data?.dev.data
  const players = dev?.players ?? []
  const by = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const lineup: Lineup = { formation, starters: Object.fromEntries(Object.entries(starters).filter(([, id]) => by.has(id))), bench: bench.filter((id) => by.has(id)) }
  const issues = useMemo(() => validateLineup(lineup, players), [lineup.formation, starters, bench, players]) // eslint-disable-line react-hooks/exhaustive-deps

  if (load.error instanceof Error && load.error.message === 'no-club') return <section className="space-y-4"><PageTitle>تشكيلة المباراة</PageTitle><p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد.</p></section>
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data || !dev) return <Failed retry={load.reload} />

  const ctx = {
    rating: Object.fromEntries(players.map((p) => { const l = latestScores(dev.assessments[p.id] ?? []); const v = skillsFor(p.pos).map((s) => l[s]?.score).filter((x): x is number => x !== undefined); return [p.id, v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0] })),
    zone: Object.fromEntries(players.map((p) => [p.id, loadFromLogs(dev.logs[p.id] ?? []).zone])),
  }
  const used = new Set([...Object.values(starters), ...bench])
  const errors = issues.filter((i) => i.level === 'error')
  const warns = issues.filter((i) => i.level === 'warn')

  function suggest() {
    const s = suggestLineup(formation, players, ctx)
    setStarters(s.lineup.starters); setBench(s.lineup.bench); setNotes(s.notes); setWhy(s.reasons); setTarget(null); setMsg(null)
  }
  function changeFormation(f: Formation) {
    const r = reshape({ formation, starters: lineup.starters, bench: lineup.bench }, f, players)
    setFormation(f); setStarters(r.starters); setTarget(null)
  }
  function assign(id: string) {
    if (!target) return
    if (target.kind === 'start') setStarters({ ...starters, [target.slot]: id })
    else if (bench.length < MAX_BENCH) setBench([...bench, id])
    setTarget(null)
  }
  function removeAt() {
    if (target?.kind === 'start') { const { [target.slot]: _gone, ...rest } = starters; setStarters(rest) }
    setTarget(null)
  }
  function open(l: SavedLineup) { setFormation(l.formation); setStarters(l.starters); setBench(l.bench); setMatchOn(l.matchOn); setOpponent(l.opponent); setWhy({}); setNotes([]); setTarget(null); setMsg({ ok: true, text: 'انفتحت التشكيلة المحفوظة' }) }
  async function save() {
    if (!opponent.trim()) return setMsg({ ok: false, text: 'اكتب اسم الخصم (حتى 40 حرف)' })
    setBusy(true); setMsg(null)
    try {
      const r = await saveLineup(user!.id, { matchOn, opponent: opponent.trim().slice(0, 40), ...lineup })
      if (r.ok) { try { localStorage.setItem('sh.nextMatch', matchOn) } catch { /* convenience only */ } setMsg({ ok: true, text: 'انحفظت التشكيلة' }); load.reload() }
      else setMsg({ ok: false, text: 'القاعدة رفضت التشكيلة: ' + r.errors.map((e) => e.code).join('، ') })
    } catch { setMsg({ ok: false, text: 'ما انحفظت. تأكد من الاتصال وحاول مرة ثانية.' }) } finally { setBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(lineupText(lineup, players, { opponent: opponent.trim() || '…', matchOn })); setMsg({ ok: true, text: 'اننسخت التشكيلة كنص' }) } catch { setMsg({ ok: false, text: 'ما قدرنا ننسخ. جرّب من متصفح ثاني.' }) }
  }

  const slotDef = target?.kind === 'start' ? FORMATION_SLOTS[formation].find((d) => d.slot === target.slot) : null
  const pickList = players
    .filter((p) => !used.has(p.id) || (target?.kind === 'start' && starters[target.slot] === p.id))
    .map((p) => ({ p, fit: slotDef ? fitOf(roleOf(p.pos), slotDef.role) : 2, blocked: p.status === 'injured' || p.status === 'suspended' || (slotDef?.role === 'GK' ? roleOf(p.pos) !== 'GK' : slotDef ? roleOf(p.pos) === 'GK' : false) }))
    .sort((a, b) => Number(a.blocked) - Number(b.blocked) || b.fit - a.fit || (a.p.num ?? 99) - (b.p.num ?? 99))

  return (
    <section className="space-y-5 md:space-y-6">
      <PageTitle>تشكيلة المباراة</PageTitle>
      <p className="glass rise flex items-start gap-3 p-4 text-sm" style={vars({ '--i': 1 })}>
        <Icon name="pitch" className="mt-0.5 size-5 shrink-0 text-pulse" />
        <span>اختر التشكيل واللاعبين، أو خذ <b>اقتراح مسودة</b>: يعتمد على المركز والجاهزية والحمل وتقييم المدرب، ويعرض أسبابه. <b>القرار للمدرب.</b> المصاب والموقوف ما ينختارون.</span>
      </p>

      <div className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 2 })}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1"><span className="text-xs text-mute">الخصم</span><input id="opponent" list="bhClubs" maxLength={40} value={opponent} onChange={(e) => setOpponent(e.target.value)} className={field} placeholder="اسم الفريق الخصم" /></label>
          <label className="block space-y-1"><span className="text-xs text-mute">تاريخ المباراة</span><input id="lineupDate" type="date" dir="ltr" value={matchOn} onChange={(e) => setMatchOn(e.target.value)} className={field} /></label>
        </div>
        <Segmented label="التشكيل" value={formation} onChange={changeFormation} options={FORMATIONS.map((f) => ({ key: f, label: f }))} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={suggest} className={btn}>اقترح التشكيلة</button>
          <button type="button" onClick={() => { setStarters({}); setBench([]); setWhy({}); setNotes([]); setTarget(null); setMsg(null) }} className={ghost}>امسح</button>
          <button type="button" onClick={save} disabled={busy || !canSave(issues)} className={btn}>احفظ التشكيلة</button>
          <button type="button" onClick={copy} className={ghost}>انسخ كنص</button>
        </div>
        {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-safe' : 'text-crimson-ink'}`}>{msg.text}</p>}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Pitch formation={formation} starters={lineup.starters} by={by} target={target} onPick={(slot) => setTarget({ kind: 'start', slot })} />
          <div role="status" aria-label="ملاحظات التشكيلة"><ul className="space-y-1 text-sm">
            {errors.map((i, k) => <li key={`e${k}`} className="flex gap-2 text-crimson-ink"><span aria-hidden>●</span>{i.text}</li>)}
            {warns.map((i, k) => <li key={`w${k}`} className="flex gap-2 text-warn"><span aria-hidden>▲</span>{i.text}</li>)}
            {notes.map((n, k) => <li key={`n${k}`} className="flex gap-2 text-mute"><span aria-hidden>ℹ</span>{n}</li>)}
            {issues.length === 0 && notes.length === 0 && <li className="flex items-center gap-2 text-safe"><Icon name="check" className="size-4" /> التشكيلة سليمة.</li>}
          </ul></div>
        </div>

        <div className="space-y-4">
          {target && (
            <article className="glass rise space-y-3 p-4" aria-label="اختيار لاعب">
              <div className="flex items-center justify-between gap-2"><h2 className="font-display text-2xl">{target.kind === 'start' ? `اختر لاعب: ${slotDef?.label}` : 'أضف بديل'}</h2><button type="button" onClick={() => setTarget(null)} className={ghost}>إغلاق</button></div>
              <ul className="max-h-96 space-y-1.5 overflow-y-auto">
                {pickList.map(({ p, fit, blocked }) => (
                  <li key={p.id}>
                    <button type="button" disabled={blocked} onClick={() => assign(p.id)} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-start disabled:opacity-50">
                      <span className="num font-display text-xl leading-none">{p.num ?? '—'}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-bold">{p.name}</span><span className="block text-xs text-mute">{p.pos}{slotDef && !blocked && <> · {FIT_TEXT[fit]}</>}</span></span>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {target.kind === 'start' && starters[target.slot] && <button type="button" onClick={removeAt} className={ghost}>أزل اللاعب من الخانة</button>}
            </article>
          )}

          <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 4 })}>
            <div className="flex items-center justify-between gap-2"><h2 className="font-display text-2xl">البدلاء <span className="num text-lg text-mute">({lineup.bench.length}/{MAX_BENCH})</span></h2>
              {bench.length < MAX_BENCH && <button type="button" onClick={() => setTarget({ kind: 'bench' })} className={ghost}>أضف بديل</button>}</div>
            <p className="text-xs text-mute">الحد الأقصى {MAX_BENCH} حسب إعداد التطبيق؛ لائحة المسابقة قد تختلف.</p>
            {lineup.bench.length === 0 ? <p className="text-sm text-mute">ما فيه بدلاء.</p> : (
              <ol className="space-y-1.5">
                {lineup.bench.map((id) => { const p = by.get(id)!; return (
                  <li key={id} className="row-in flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3">
                    <span className="num font-display text-xl leading-none">{p.num ?? '—'}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-bold">{p.name}</span><span className="block text-xs text-mute">{p.pos}{why[id]?.length ? ` · ${why[id].join('، ')}` : ''}</span></span>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                    <button type="button" onClick={() => setBench(bench.filter((x) => x !== id))} aria-label={`أزل ${p.name} من البدلاء`} className="grid size-11 place-items-center rounded-xl text-mute hover:text-ink">✕</button>
                  </li>
                ) })}
              </ol>
            )}
          </article>

          {Object.keys(why).length > 0 && (
            <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 5 })}>
              <h2 className="font-display text-2xl">ليش هالاقتراح</h2>
              <ul className="space-y-1 text-sm">
                {FORMATION_SLOTS[formation].map((d) => { const p = by.get(lineup.starters[d.slot]); return p && why[p.id] ? <li key={d.slot}><b>{p.name}</b> <span className="text-mute">({d.label}): {why[p.id].join('، ')}</span></li> : null })}
              </ul>
              <p className="text-xs text-mute">مسودة بقاعدة بسيطة: المركز أهم شي، ثم الجاهزية، ثم الحمل، ثم تقييم المدرب.</p>
            </article>
          )}

          <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 6 })}>
            <h2 className="font-display text-2xl">التشكيلات المحفوظة</h2>
            {load.data.saved.length === 0 ? <p className="text-sm text-mute">ما فيه تشكيلات محفوظة.</p> : (
              <ul className="divide-y divide-white/10">
                {load.data.saved.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1 text-sm"><b>ضد {l.opponent}</b> <span className="num text-xs text-mute">· {fmtDate(l.matchOn)} · {l.formation}</span></span>
                    <button type="button" onClick={() => open(l)} className={ghost}>افتح</button>
                    <button type="button" onClick={async () => { await deleteLineup(l.id); load.reload() }} className={ghost}>احذف</button></li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </div>
      <AvailabilityPanel players={players} onChanged={load.reload} />
      <MatchCard lineup={lineup} players={players} opponent={opponent.trim()} matchOn={matchOn} />
      {load.data.dev.demo && <DemoNote text="* لاعبون وتشكيلات خيالية للعرض، مو بيانات حقيقية. الأندية خيالية." />}
    </section>
  )
}
