import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { DemoNote } from '../components/DemoNote'
import { Icon } from '../components/Icon'
import { PageTitle } from '../components/PageTitle'
import { Segmented } from '../components/Segmented'
import { Failed, Loading } from '../components/States'
import { deleteSession, getAttendance, saveAttendance } from '../data/attendance'
import { getDevelopment, type DevPlayer } from '../data/development'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import { fmtDate } from '../lib/format'
import {
  attendanceStats, byConcern, counts, defaultMarks, KIND_TEXT, MIN_SESSIONS, REASON_TEXT, REASONS, REPEAT_ABSENT, STATUS_ORDER, STATUS_TEXT, WINDOW_DAYS,
  type AStatus, type Kind, type Mark, type Reason, type Session,
} from '../lib/attendance'

const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'
const btn = 'min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink disabled:opacity-60'
const ghost = 'min-h-11 rounded-xl border border-white/15 px-4 text-sm'
const TONE: Record<AStatus, string> = { present: 'border-safe bg-safe/20 text-safe', late: 'border-warn bg-warn/20 text-warn', excused: 'border-pulse bg-pulse/15 text-pulse', absent: 'border-crimson-ink bg-crimson/20 text-crimson-ink' }
const todayIso = () => new Date().toISOString().slice(0, 10)
const minDay = () => new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)

function Sheet({ players, initial, day, kind, existing, onSaved }: { players: DevPlayer[]; initial: Record<string, Mark>; day: string; kind: Kind; existing: boolean; onSaved: () => void }) {
  const [marks, setMarks] = useState<Record<string, Mark>>(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const c = counts(marks)
  const set = (id: string, m: Mark) => { setMarks({ ...marks, [id]: m }); setMsg(null) }
  async function save() {
    setBusy(true); setMsg(null)
    try {
      const r = await saveAttendance(day, kind, marks)
      if (r.ok) { setMsg({ ok: true, text: 'انحفظ التسجيل' }); onSaved() } else setMsg({ ok: false, text: 'القاعدة رفضت التسجيل: ' + r.errors.map((e) => e.code).join('، ') })
    } catch { setMsg({ ok: false, text: 'ما انحفظ. تأكد من الاتصال وحاول مرة ثانية.' }) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" aria-label="ملخص التسجيل" role="status">
        {STATUS_ORDER.map((s) => <span key={s} className={`rounded-full border px-3 py-1 text-sm ${TONE[s]}`}>{STATUS_TEXT[s]} <b className="num">{c[s]}</b></span>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMarks(defaultMarks(players))} className={ghost}>الكل حاضر</button>
        <button type="button" onClick={save} disabled={busy || players.length === 0} className={btn}>{existing ? 'احفظ التعديل' : 'احفظ التسجيل'}</button>
        {msg && <span role="status" className={`self-center text-sm ${msg.ok ? 'text-safe' : 'text-crimson-ink'}`}>{msg.text}</span>}
      </div>
      <p className="text-xs text-mute">راجع الأسماء قبل الحفظ: الافتراضي «حاضر» للكل (والمصاب «غائب بعذر طبي»).</p>
      <ul className="space-y-2">
        {players.map((p, i) => {
          const m = marks[p.id] ?? { status: 'present' as const }
          return (
            <li key={p.id} className="row-in space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5" style={vars({ '--i': Math.min(i, 10) })}>
              <div className="flex items-center gap-3"><span className="num grid size-9 place-items-center rounded-lg bg-white/5 font-display text-lg leading-none">{p.num ?? '—'}</span><span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                {m.status === 'excused' && (
                  <select aria-label={`سبب غياب ${p.name}`} value={m.reason ?? 'personal'} onChange={(e) => set(p.id, { status: 'excused', reason: e.target.value as Reason })} className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-2 text-sm">
                    {REASONS.map((r) => <option key={r} value={r}>{REASON_TEXT[r]}</option>)}
                  </select>)}
              </div>
              <div role="radiogroup" aria-label={`حضور ${p.name}`} className="grid grid-cols-4 gap-1">
                {STATUS_ORDER.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={m.status === s} onClick={() => set(p.id, s === 'excused' ? { status: s, reason: m.reason ?? 'personal' } : { status: s })} className={`min-h-11 rounded-lg border px-1 text-xs transition-colors ${m.status === s ? TONE[s] : 'border-white/10 text-mute'}`}>{STATUS_TEXT[s]}</button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Attendance() {
  const { user } = useAuth()
  const load = useLoad(async () => ({ dev: await getDevelopment(user!.id), sessions: await getAttendance(user!.id) }), [user?.id])
  const [kind, setKind] = useState<Kind>('training')
  const [day, setDay] = useState(todayIso)
  const canWrite = user!.role === 'club_admin'
  const players = load.data?.dev.data.players ?? []
  const sessions: Session[] = load.data?.sessions ?? []
  const existing = sessions.find((s) => s.day === day && s.kind === kind)
  const stats = useMemo(() => byConcern(attendanceStats(sessions, players.map((p) => p.id))), [sessions, players])
  const by = new Map(players.map((p) => [p.id, p]))

  if (load.error instanceof Error && load.error.message === 'no-club') return <section className="space-y-4"><PageTitle>الحضور والغياب</PageTitle><p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد.</p></section>
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data) return <Failed retry={load.reload} />
  const dayOk = day >= minDay() && day <= todayIso()

  return (
    <section className="space-y-5 md:space-y-6">
      <PageTitle>الحضور والغياب</PageTitle>
      <p className="glass rise flex items-start gap-3 p-4 text-sm" style={vars({ '--i': 1 })}>
        <Icon name="check" className="mt-0.5 size-5 shrink-0 text-pulse" />
        <span>سجّل حضور التمرين أو المباراة بنقرات. <b>الغياب بعذر ما يحسب ضد اللاعب.</b> النسبة لآخر {WINDOW_DAYS} يوم وتحتاج {MIN_SESSIONS} جلسات محسوبة، و«غياب متكرر» = {REPEAT_ABSENT} غيابات بلا عذر متتالية. للمتابعة بس، مو للعقاب.</span>
      </p>

      {players.length === 0 ? <p className="glass p-5 text-mute">ما فيه لاعبين بناديك للحين. استوردهم من مركز البيانات.</p> : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          {canWrite && (
            <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 2 })}>
              <h2 className="font-display text-2xl">تسجيل جلسة</h2>
              <Segmented label="نوع الجلسة" value={kind} onChange={setKind} options={(['training', 'match'] as Kind[]).map((k) => ({ key: k, label: KIND_TEXT[k] }))} />
              <label className="block space-y-1"><span className="text-xs text-mute">اليوم</span><input id="attDay" type="date" dir="ltr" value={day} min={minDay()} max={todayIso()} onChange={(e) => setDay(e.target.value)} className={field} /></label>
              {existing && <p role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-2 text-sm">هالجلسة مسجّلة من قبل: الحفظ يستبدلها.</p>}
              {dayOk ? <Sheet key={`${day}|${kind}|${players.length}`} players={players} initial={{ ...defaultMarks(players), ...(existing?.marks ?? {}) }} day={day} kind={kind} existing={!!existing} onSaved={load.reload} />
                : <p role="alert" className="text-sm text-crimson-ink">اختر يوم من آخر 90 يوم، مو بالمستقبل.</p>}
            </article>
          )}

          <div className="space-y-4">
            <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 3 })}>
              <h2 className="font-display text-2xl">الالتزام آخر {WINDOW_DAYS} يوم</h2>
              <ul className="divide-y divide-white/10">
                {stats.map((s, i) => { const p = by.get(s.id); if (!p) return null; return (
                  <li key={s.id} data-player={p.num} className="row-in space-y-1.5 py-2.5" style={vars({ '--i': Math.min(i, 12) })}>
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold"><span className="num text-mute">{p.num ?? '—'}</span> {p.name}</span>
                      {s.repeated ? <span className="rounded-full bg-crimson/20 px-2.5 py-0.5 text-xs text-crimson-ink">غياب متكرر · <span className="num">{s.streak}</span></span> : s.rate === null ? <span className="text-xs text-mute">بيانات قليلة</span> : <span className="font-display text-xl leading-none" dir="ltr"><span className="num">{Math.round(s.rate * 100)}%</span></span>}</div>
                    {s.rate !== null && <div role="img" aria-label={`نسبة الحضور ${Math.round(s.rate * 100)}%`} className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`grow h-full rounded-full ${s.rate >= 0.85 ? 'bg-safe' : s.rate >= 0.7 ? 'bg-warn' : 'bg-crimson-ink'}`} style={{ width: `${s.rate * 100}%` }} /></div>}
                    <p className="text-xs text-mute">حضر <span className="num">{s.present}</span> · تأخر <span className="num">{s.late}</span> · غاب <span className="num">{s.absent}</span> · بعذر <span className="num">{s.excused}</span></p>
                  </li>) })}
              </ul>
            </article>

            <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 4 })}>
              <h2 className="font-display text-2xl">السجل</h2>
              {sessions.length === 0 ? <p className="text-sm text-mute">ما فيه جلسات مسجّلة.</p> : (
                <ul className="divide-y divide-white/10">
                  {[...sessions].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 12).map((s) => { const c = counts(s.marks); return (
                    <li key={s.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1 text-sm"><b>{KIND_TEXT[s.kind]}</b> <span className="num text-xs text-mute">· {fmtDate(s.day)} · حاضر {c.present + c.late} من {Object.keys(s.marks).length}</span></span>
                      {canWrite && <><button type="button" onClick={() => { setKind(s.kind); setDay(s.day) }} className={ghost}>افتح</button><button type="button" onClick={async () => { await deleteSession(s.id); load.reload() }} className={ghost}>احذف</button></>}</li>) })}
                </ul>
              )}
            </article>
          </div>
        </div>
      )}
      {load.data.dev.demo && <DemoNote text="* لاعبون وجلسات خيالية للعرض، مو بيانات حقيقية. الأندية خيالية." />}
    </section>
  )
}
