import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { DemoNote } from '../components/DemoNote'
import { Icon } from '../components/Icon'
import { PageTitle } from '../components/PageTitle'
import { Failed, Loading } from '../components/States'
import { deleteReport, getReports, saveReport, type Report } from '../data/analysis'
import { getDevelopment, type DevPlayer } from '../data/development'
import { useLoad } from '../data/useLoad'
import {
  advance, clock, insights, isShot, keeperSummary, KIND_TEXT, KINDS, lastMinute, MAX_EVENTS, momentum, ordered, snapshot, SPEEDS, validateEvent,
  type EKind, type Ev, type Team,
} from '../lib/analysis'
import { vars } from '../lib/css'
import { fmtDate } from '../lib/format'
import { prefersReducedMotion } from '../lib/motion'

const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'
const btn = 'min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink disabled:opacity-60'
const ghost = 'min-h-11 rounded-xl border border-white/15 px-4 text-sm disabled:opacity-60'
const todayIso = () => new Date().toISOString().slice(0, 10)
const ERR: Record<string, string> = {
  bad_date: 'تاريخ المباراة لازم يكون اليوم أو قبله.', bad_opponent: 'اسم الخصم مطلوب (حتى 40 حرف).', bad_possession: 'الاستحواذ من 0 إلى 100.', unknown_keeper: 'الحارس مو من لاعبي ناديك.',
  bad_count: 'عدد الأحداث من 1 إلى 200.', bad_minute: 'الدقيقة من 0 إلى 130.', bad_team: 'الفريق غير معروف.', bad_kind: 'نوع الحدث غير معروف.', unknown_player: 'لاعب مو من ناديك.',
  player_on_opponent: 'ما نسجّل لاعب لفريق الخصم.', bad_position: 'الموضع خارج الملعب.',
}
const needsPlayer = (k: EKind) => k !== 'corner'

/* Full pitch, their goal at the top. x runs across, y from their goal line (0) to ours (100). Positions are taps, so they are approximate. */
function Pitch({ children, onTap, label }: { children?: React.ReactNode; onTap?: (x: number, y: number) => void; label: string }) {
  const ref = useRef<SVGSVGElement>(null)
  function tap(e: React.MouseEvent<SVGSVGElement>) {
    if (!onTap || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    onTap(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))), Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100))))
  }
  return (
    <svg ref={ref} role="img" aria-label={label} viewBox="0 0 100 100" onClick={tap} className={`turf w-full rounded-xl border border-white/10 bg-turf/30 ${onTap ? 'cursor-crosshair' : ''}`} style={{ aspectRatio: '1 / 1', maxHeight: '26rem' }} fill="none">
      <g stroke="currentColor" strokeWidth="0.5" className="text-white/30"><rect x="2" y="2" width="96" height="96" /><line x1="2" y1="50" x2="98" y2="50" /><circle cx="50" cy="50" r="9" />
        <rect x="28" y="2" width="44" height="16" /><rect x="40" y="2" width="20" height="6" /><rect x="28" y="82" width="44" height="16" /><rect x="40" y="92" width="20" height="6" /></g>
      {children}
    </svg>
  )
}

const dot = (e: Ev, key: string, fresh: boolean) => {
  const color = e.team === 'us' ? 'text-pulse' : 'text-crimson-ink'
  const cx = e.x!, cy = e.y!
  return (
    <g key={key} className={`bar-in ${color}`} data-shot={e.kind} data-team={e.team}>
      {e.kind === 'goal' && <><circle cx={cx} cy={cy} r="3.4" fill="currentColor" /><circle cx={cx} cy={cy} r="1.2" fill="#fff" />{fresh && <circle cx={cx} cy={cy} r="3.4" stroke="currentColor" strokeWidth="0.8" className="svg-ping" />}</>}
      {e.kind === 'shot_on' && <circle cx={cx} cy={cy} r="2.4" fill="currentColor" />}
      {e.kind === 'shot' && <circle cx={cx} cy={cy} r="2.2" stroke="currentColor" strokeWidth="0.9" />}
    </g>
  )
}

function Replay({ report, players }: { report: Report; players: Map<string, DevPlayer> }) {
  const end = lastMinute(report.events)
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const [minute, setMinute] = useState(reduced ? end : 0)
  const [playing, setPlaying] = useState(!reduced)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const last = useRef(0)

  useEffect(() => {
    if (!playing) return
    let raf = 0
    last.current = performance.now()
    const step = (t: number) => {
      const dt = t - last.current; last.current = t
      setMinute((m) => { const n = advance(m, dt, speed, end); if (n >= end) setPlaying(false); return n })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, end])

  const whole = clock(minute)
  const snap = useMemo(() => snapshot(report.events, whole), [report.events, whole])
  const fin = useMemo(() => snapshot(report.events, 130), [report.events])
  const buckets = useMemo(() => momentum(report.events, whole, end), [report.events, whole, end])
  const peak = Math.max(1, ...momentum(report.events, end, end).flatMap((b) => [b.us, b.opp]))
  const keeper = keeperSummary(report.events, whole)
  const notes = useMemo(() => insights(report.events, report.possession), [report.events, report.possession])
  const atEnd = minute >= end
  const who = (e: Ev) => (e.playerId ? players.get(e.playerId) : undefined)
  const gk = report.keeperId ? players.get(report.keeperId) : undefined
  const rows: [string, number, number][] = [['تسديدات', snap.us.shots, snap.opp.shots], ['على المرمى', snap.us.onTarget, snap.opp.onTarget], ['ركنيات', snap.us.corners, snap.opp.corners],
    ['بطاقات صفراء', snap.us.yellow, snap.opp.yellow], ['بطاقات حمراء', snap.us.red, snap.opp.red], ['تبديلات', snap.us.subs, snap.opp.subs]]
  const mapped = snap.seen.filter((e) => isShot(e) && e.x != null)
  const unmapped = snap.seen.filter((e) => isShot(e) && e.x == null).length

  return (
    <div className="space-y-4" data-replay>
      <p className="sr-only">النتيجة النهائية: نحن {fin.us.goals}، {report.opponent} {fin.opp.goals}. تسديداتنا {fin.us.shots} وتسديدات الخصم {fin.opp.shots}.</p>
      <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 1 })}>
        <div className="flex items-center justify-center gap-3" aria-hidden>
          <span className="min-w-0 flex-1 truncate text-end font-bold">{report.home ? 'نحن' : report.opponent}</span>
          <span className="digit font-display text-5xl leading-none" data-score="home"><span className="num">{report.home ? snap.us.goals : snap.opp.goals}</span></span>
          <span className="font-display text-2xl text-mute">:</span>
          <span className="digit font-display text-5xl leading-none" data-score="away"><span className="num">{report.home ? snap.opp.goals : snap.us.goals}</span></span>
          <span className="min-w-0 flex-1 truncate font-bold">{report.home ? report.opponent : 'نحن'}</span>
        </div>
        <p className="text-center text-sm text-mute" data-clock aria-hidden>الدقيقة <span className="num text-ink">{whole}</span>{whole > 90 && <> (وقت إضافي)</>}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { if (atEnd) setMinute(0); setPlaying(!playing) }} className={btn}>{playing ? 'إيقاف' : atEnd ? 'أعد العرض' : 'شغّل'}</button>
          <div role="group" aria-label="السرعة" className="flex gap-1">{SPEEDS.map((s) => <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)} className={`min-h-11 min-w-11 rounded-xl border px-3 text-sm ${speed === s ? 'border-pulse bg-pulse/15 text-pulse' : 'border-white/15 text-mute'}`}><span className="num">{s}×</span></button>)}</div>
          <button type="button" onClick={() => { setPlaying(false); setMinute(end) }} className={ghost}>للنهاية</button>
        </div>
        <input id="replayMinute" type="range" min={0} max={end} step={1} value={whole} aria-label="دقيقة المباراة" aria-valuetext={`الدقيقة ${whole}`} onChange={(e) => { setPlaying(false); setMinute(Number(e.target.value)) }} className="h-11 w-full accent-pulse" dir="ltr" />
      </article>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 2 })}>
          <h2 className="font-display text-2xl">خريطة التسديدات</h2>
          <Pitch label={`خريطة التسديدات حتى الدقيقة ${whole}`}>{mapped.map((e, i) => dot(e, `${e.minute}-${e.kind}-${e.team}-${i}`, playing && e.kind === 'goal' && whole - e.minute < 2))}</Pitch>
          <p className="text-xs text-mute"><span className="text-pulse">●</span> نحن · <span className="text-crimson-ink">●</span> الخصم · هدف: دائرة ممتلئة بنقطة · على المرمى: ممتلئة · خارج المرمى: فاضية. مواضع تقريبية من نقرات النادي{unmapped > 0 && <> · {unmapped} بدون موضع</>}.</p>
        </article>

        <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 3 })}>
          <h2 className="font-display text-2xl">الزخم</h2>
          <div role="img" aria-label="التسديدات لكل 15 دقيقة، نحن فوق والخصم تحت" className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
            {buckets.map((b) => (
              <div key={b.from} className="flex flex-col items-stretch gap-0.5 text-center text-[10px] text-mute">
                <div className="flex h-16 items-end"><div className="w-full rounded-t bg-pulse transition-[height] duration-300" style={{ height: `${(b.us / peak) * 100}%` }} /></div>
                <span className="num">{b.from}</span>
                <div className="flex h-16 items-start"><div className="w-full rounded-b bg-crimson-ink transition-[height] duration-300" style={{ height: `${(b.opp / peak) * 100}%` }} /></div>
              </div>))}
          </div>
          <h2 className="pt-1 font-display text-2xl">الإحصاءات</h2>
          <ul className="space-y-2">
            {rows.map(([label, a, b]) => (
              <li key={label} className="space-y-1">
                <div className="flex items-center justify-between text-sm"><span className="num font-bold text-pulse">{a}</span><span className="text-mute">{label}</span><span className="num font-bold text-crimson-ink">{b}</span></div>
                <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/5" dir="ltr"><div className="rounded-s-full bg-pulse transition-[width] duration-300" style={{ width: `${a + b === 0 ? 0 : (a / (a + b)) * 100}%` }} /><div className="ms-auto rounded-e-full bg-crimson-ink transition-[width] duration-300" style={{ width: `${a + b === 0 ? 0 : (b / (a + b)) * 100}%` }} /></div>
              </li>))}
          </ul>
          {report.possession !== null && <p className="text-sm text-mute">الاستحواذ (يدخله النادي للمباراة كاملة): نحن <bdi dir="ltr" className="num text-ink">{report.possession}%</bdi></p>}
        </article>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 4 })}>
          <h2 className="font-display text-2xl">الحارس{gk ? ` · ${gk.name}` : ''}</h2>
          <p className="text-sm" data-keeper>تصدّى لـ <b className="num">{keeper.saves}</b> من <b className="num">{keeper.faced}</b> تسديدة على المرمى · استقبل <b className="num">{keeper.conceded}</b>{keeper.pct !== null && <> · نسبة التصدي <bdi dir="ltr" className="num">{Math.round(keeper.pct * 100)}%</bdi></>}</p>
          <p className="text-xs text-mute">أرقام من الأحداث اللي أدخلتها (تسديدة الخصم على المرمى = تصدٍّ). مو تقييم للحارس.</p>
        </article>
        <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 5 })}>
          <h2 className="font-display text-2xl">ملاحظات على الفريق</h2>
          {notes.length === 0 ? <p className="text-sm text-mute">ما لقيت شي لافت بهالأرقام.</p> : <ul className="list-disc space-y-1 ps-5 text-sm" data-notes>{notes.map((n) => <li key={n.key}>{n.text}</li>)}</ul>}
          <p className="text-xs text-mute">قواعد بسيطة على أرقام التقرير، مو ذكاء اصطناعي، وما تقيّم لاعب بعينه. القرار للمدرب.</p>
        </article>
      </div>

      <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 6 })}>
        <h2 className="font-display text-2xl">الأحداث</h2>
        {snap.seen.length === 0 ? <p className="text-sm text-mute">لسا ما صار شي.</p> : (
          <ul className="divide-y divide-white/10" data-events>
            {[...snap.seen].reverse().slice(0, 40).map((e, i) => { const p = who(e); return (
              <li key={`${e.minute}-${e.kind}-${e.team}-${snap.seen.length - i}`} className="row-in flex items-center gap-3 py-2 text-sm" style={vars({ '--i': 0 })}>
                <span className="num w-8 text-mute">{e.minute}'</span>
                <span className={`size-2.5 shrink-0 rounded-full ${e.team === 'us' ? 'bg-pulse' : 'bg-crimson-ink'}`} aria-hidden />
                <span className="min-w-0 flex-1">{e.team === 'us' ? 'نحن' : report.opponent} · {KIND_TEXT[e.kind]}{p && <> · <span className="num text-mute">{p.num ?? ''}</span> {p.name}</>}</span>
              </li>) })}
          </ul>)}
      </article>
    </div>
  )
}

type Draft = { matchOn: string; opponent: string; home: boolean; possession: string; keeperId: string; events: Ev[] }

function Editor({ players, onSaved, onCancel }: { players: DevPlayer[]; onSaved: (id: string) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>({ matchOn: todayIso(), opponent: '', home: true, possession: '', keeperId: '', events: [] })
  const [minute, setMinute] = useState('1')
  const [team, setTeam] = useState<Team>('us')
  const [kind, setKind] = useState<EKind>('shot_on')
  const [player, setPlayer] = useState('')
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const keepers = players.filter((p) => p.pos.includes('حارس'))
  const withPos = isShot({ minute: 0, team, kind })
  const add = () => {
    const e: Ev = { minute: Number(minute), team, kind, playerId: team === 'us' && needsPlayer(kind) && player ? player : null, x: withPos && pos ? pos.x : null, y: withPos && pos ? pos.y : null }
    const bad = validateEvent(e)
    if (bad) { setMsg({ ok: false, text: ERR[bad] }); return }
    if (d.events.length >= MAX_EVENTS) { setMsg({ ok: false, text: ERR.bad_count }); return }
    setD({ ...d, events: [...d.events, e] }); setPos(null); setMsg(null)
  }
  async function save() {
    setBusy(true); setMsg(null)
    try {
      const poss = d.possession === '' ? null : Number(d.possession)
      const r = await saveReport({ matchOn: d.matchOn, opponent: d.opponent.trim(), home: d.home, possession: poss, keeperId: d.keeperId || null, events: d.events })
      if (r.ok) onSaved(r.id); else setMsg({ ok: false, text: r.errors.map((e) => ERR[e.code] ?? e.code).join(' ') })
    } catch { setMsg({ ok: false, text: 'ما انحفظ. تأكد من الاتصال وحاول مرة ثانية.' }) } finally { setBusy(false) }
  }
  const list = ordered(d.events)
  return (
    <article className="glass rise space-y-4 p-4 md:p-5" style={vars({ '--i': 2 })}>
      <h2 className="font-display text-2xl">تقرير مباراة جديد</h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <label className="block space-y-1"><span className="text-xs text-mute">تاريخ المباراة</span><input id="anDay" type="date" dir="ltr" value={d.matchOn} max={todayIso()} onChange={(e) => setD({ ...d, matchOn: e.target.value })} className={field} /></label>
        <label className="block space-y-1"><span className="text-xs text-mute">الخصم</span><input id="anOpp" maxLength={40} value={d.opponent} onChange={(e) => setD({ ...d, opponent: e.target.value })} className={field} /></label>
        <label className="block space-y-1"><span className="text-xs text-mute">الملعب</span><select id="anHome" value={d.home ? 'h' : 'a'} onChange={(e) => setD({ ...d, home: e.target.value === 'h' })} className={field}><option value="h">ملعبنا</option><option value="a">ضيوف</option></select></label>
        <label className="block space-y-1"><span className="text-xs text-mute">استحواذنا % (اختياري)</span><input id="anPoss" type="number" inputMode="numeric" min={0} max={100} dir="ltr" value={d.possession} onChange={(e) => setD({ ...d, possession: e.target.value })} className={field} /></label>
        <label className="block space-y-1 sm:col-span-2"><span className="text-xs text-mute">حارس المباراة (اختياري)</span><select id="anKeeper" value={d.keeperId} onChange={(e) => setD({ ...d, keeperId: e.target.value })} className={field}><option value="">بدون</option>{keepers.map((p) => <option key={p.id} value={p.id}>{p.num ?? '—'} · {p.name}</option>)}</select></label>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-white/10 p-3">
        <legend className="px-1 text-sm font-bold">أضف حدث</legend>
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-end gap-2">
          <label className="block space-y-1"><span className="text-xs text-mute">الدقيقة</span><input id="evMin" type="number" inputMode="numeric" min={0} max={130} dir="ltr" value={minute} onChange={(e) => setMinute(e.target.value)} className={field} /></label>
          <div role="group" aria-label="الفريق" className="grid grid-cols-2 gap-1">{(['us', 'opp'] as Team[]).map((t) => <button key={t} type="button" aria-pressed={team === t} onClick={() => setTeam(t)} className={`min-h-11 rounded-xl border text-sm ${team === t ? 'border-pulse bg-pulse/15 text-pulse' : 'border-white/15 text-mute'}`}>{t === 'us' ? 'نحن' : 'الخصم'}</button>)}</div>
        </div>
        <div role="group" aria-label="نوع الحدث" className="grid grid-cols-2 gap-1 sm:grid-cols-4">{KINDS.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`min-h-11 rounded-xl border px-1 text-xs ${kind === k ? 'border-pulse bg-pulse/15 text-pulse' : 'border-white/15 text-mute'}`}>{KIND_TEXT[k]}</button>)}</div>
        {team === 'us' && needsPlayer(kind) && <label className="block space-y-1"><span className="text-xs text-mute">اللاعب (اختياري)</span><select id="evPlayer" value={player} onChange={(e) => setPlayer(e.target.value)} className={field}><option value="">بدون</option>{players.map((p) => <option key={p.id} value={p.id}>{p.num ?? '—'} · {p.name}</option>)}</select></label>}
        {withPos && (<div className="space-y-1"><p className="text-xs text-mute">اضغط على الملعب لتحديد الموضع تقريباً (اختياري){pos && <> · <b className="text-ink">محدد</b> <button type="button" onClick={() => setPos(null)} className="underline">امسح</button></>}</p>
          <Pitch label="حدّد موضع التسديدة" onTap={(x, y) => setPos({ x, y })}>{pos && <circle cx={pos.x} cy={pos.y} r="2.6" fill="currentColor" className={team === 'us' ? 'text-pulse' : 'text-crimson-ink'} />}</Pitch></div>)}
        <button type="button" onClick={() => { add(); setMinute((m) => m) }} className={btn}>أضف الحدث</button>
      </fieldset>

      <div className="space-y-1">
        <p className="text-sm text-mute">الأحداث المضافة: <b className="num text-ink">{list.length}</b> من {MAX_EVENTS}</p>
        {list.length > 0 && <ul className="max-h-56 divide-y divide-white/10 overflow-y-auto" data-draft>{list.map((e, i) => <li key={i} className="flex items-center gap-2 py-1.5 text-sm"><span className="num w-8 text-mute">{e.minute}'</span><span className="min-w-0 flex-1">{e.team === 'us' ? 'نحن' : 'الخصم'} · {KIND_TEXT[e.kind]}{e.x != null && ' · بموضع'}</span><button type="button" aria-label={`احذف ${KIND_TEXT[e.kind]} الدقيقة ${e.minute}`} onClick={() => setD({ ...d, events: d.events.filter((x) => x !== e) })} className="min-h-11 min-w-11 rounded-lg border border-white/15 text-mute">✕</button></li>)}</ul>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={busy || d.events.length === 0 || d.opponent.trim() === ''} className={btn}>احفظ التقرير</button>
        <button type="button" onClick={onCancel} className={ghost}>ألغ</button>
        {msg && <span role="status" className={`text-sm ${msg.ok ? 'text-safe' : 'text-crimson-ink'}`}>{msg.text}</span>}
      </div>
    </article>
  )
}

export function Analysis() {
  const { user } = useAuth()
  const load = useLoad(async () => ({ dev: await getDevelopment(user!.id), reports: await getReports(user!.id) }), [user?.id])
  const [sel, setSel] = useState<string | 'new' | null>(null)
  const reports: Report[] = load.data?.reports ?? []
  const players = useMemo(() => new Map((load.data?.dev.data.players ?? []).map((p) => [p.id, p])), [load.data])
  const current = sel && sel !== 'new' ? reports.find((r) => r.id === sel) ?? null : null

  if (load.error instanceof Error && load.error.message === 'no-club') return <section className="space-y-4"><PageTitle>تقرير المباراة</PageTitle><p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد.</p></section>
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data) return <Failed retry={load.reload} />
  const score = (r: Report) => { const s = snapshot(r.events, 130); return r.home ? `${s.us.goals} : ${s.opp.goals}` : `${s.opp.goals} : ${s.us.goals}` }

  return (
    <section className="space-y-5 md:space-y-6">
      <PageTitle>تقرير المباراة</PageTitle>
      <p className="glass rise flex items-start gap-3 p-4 text-sm" style={vars({ '--i': 1 })}>
        <Icon name="pitch" className="mt-0.5 size-5 shrink-0 text-pulse" />
        <span>أدخل أحداث المباراة بعدها (أهداف، تسديدات، ركنيات، بطاقات)، والتطبيق يبني منها إعادة عرض متحركة وأرقام. <b>ما فيه فيديو ولا تتبع لاعبين ولا ذكاء اصطناعي:</b> كل شي من اللي تدخله أنت، والمواضع تقريبية. للإدارة فقط، لأن التقرير معلومة تنافسية.</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setSel('new')} className={btn}>تقرير جديد</button>
        {reports.map((r) => <button key={r.id} type="button" data-report={r.opponent} aria-pressed={sel === r.id} onClick={() => setSel(r.id)} className={`min-h-11 rounded-xl border px-3 text-sm ${sel === r.id ? 'border-pulse bg-pulse/15 text-pulse' : 'border-white/15'}`}>{r.opponent} · <span className="num" dir="ltr">{score(r)}</span> · <span className="num text-xs text-mute">{fmtDate(r.matchOn)}</span></button>)}
      </div>
      {sel === 'new' && <Editor players={load.data.dev.data.players} onCancel={() => setSel(null)} onSaved={(id) => { load.reload(); setSel(id) }} />}
      {current && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-2xl">{current.home ? 'نحن' : current.opponent} ضد {current.home ? current.opponent : 'نحن'} · <span className="num text-lg text-mute">{fmtDate(current.matchOn)}</span></h2>
            <button type="button" onClick={async () => { await deleteReport(current.id); setSel(null); load.reload() }} className={ghost}>احذف التقرير</button></div>
          <Replay key={current.id} report={current} players={players} />
        </>
      )}
      {sel === null && <p className="glass p-5 text-mute">اختر تقرير لتشوف إعادة العرض، أو سجّل تقرير جديد.</p>}
      {load.data.dev.demo && <DemoNote text="* مباراة وأحداث خيالية للعرض، مو بيانات حقيقية. الأندية خيالية." />}
    </section>
  )
}
