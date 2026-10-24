import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { DemoNote } from '../components/DemoNote'
import { Gauge } from '../components/Gauge'
import { Icon } from '../components/Icon'
import { PageTitle } from '../components/PageTitle'
import { Segmented } from '../components/Segmented'
import { Failed, Loading } from '../components/States'
import { addGoal, finishGoal, getDevelopment, logSession, removeGoal, saveAssessment, type DevData, type DevPlayer } from '../data/development'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import {
  goalProgress, isGoalkeeper, latestScores, loadFromLogs, nextSaturday, SCORE_LABEL, SKILL_LABEL, skillsFor, trendOf, weakest, weekPlan,
  type Intensity, type SkillId,
} from '../lib/development'
import { fmtDate } from '../lib/format'
import { STATUS } from '../lib/squad'

const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'
const btn = 'min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink disabled:opacity-60'
const ghost = 'min-h-11 rounded-xl border border-white/15 px-4 text-sm'
const INTENSITY: Record<Intensity, { label: string; cls: string }> = {
  low: { label: 'منخفضة', cls: 'bg-safe/15 text-safe' }, medium: { label: 'متوسطة', cls: 'bg-pulse/15 text-pulse' },
  high: { label: 'عالية', cls: 'bg-warn/15 text-warn' }, very_high: { label: 'عالية جداً', cls: 'bg-crimson/20 text-crimson-ink' },
}
const ZONE_TEXT = { low: 'حمل منخفض', safe: 'آمن', caution: 'انتبه: خفّف الشدة', danger: 'خطر: راجع الطبيب' } as const
const today = () => new Date().toISOString().slice(0, 10)

function Meter({ score, i }: { score: number; i: number }) {
  return (
    <span role="img" aria-label={`${score} من 5`} className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-2 w-6 rounded-full ${n <= score ? 'bar-in bg-pulse' : 'bg-white/10'}`} style={vars({ '--i': i })} />)}
    </span>
  )
}

function Skills({ player, data, canAssess, userId, reload }: { player: DevPlayer; data: DevData; canAssess: boolean; userId: string; reload: () => void }) {
  const skills = skillsFor(player.pos)
  const latest = latestScores(data.assessments[player.id] ?? [])
  const weak = weakest(latest, skills, 2)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Record<SkillId, number>>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const start = () => { setDraft(Object.fromEntries(skills.filter((s) => latest[s]).map((s) => [s, latest[s]!.score]))); setEditing(true) }
  async function save() {
    setBusy(true); setErr(null)
    try { await saveAssessment(userId, player.id, draft); setEditing(false); reload() } catch { setErr('ما انحفظ التقييم. حاول مرة ثانية.') } finally { setBusy(false) }
  }
  return (
    <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 2 })}>
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="font-display text-2xl">{isGoalkeeper(player.pos) ? 'مهارات الحارس' : 'المهارات'}</h2><p className="text-xs text-mute">تقييم المدرب (1–5)، مو قياس آلي.</p></div>
        {canAssess && !editing && <button type="button" onClick={start} className={ghost}>قيّم الآن</button>}
      </div>
      {Object.keys(latest).length === 0 && !editing && <p className="text-sm text-mute">ما فيه تقييم للحين. {canAssess ? 'اضغط «قيّم الآن» عشان تطلع الأولويات.' : 'مدير النادي يسجّل التقييم.'}</p>}
      <ul className="space-y-2">
        {skills.map((s, i) => {
          const l = latest[s]
          const t = l ? trendOf(l.score, l.prev) : 'flat'
          return (
            <li key={s} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="flex flex-wrap items-center gap-2 text-sm font-bold">{SKILL_LABEL[s]}
                {weak.includes(s) && !editing && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs font-normal text-warn">أولوية</span>}
                {l && !editing && t !== 'flat' && <span className={`text-xs font-normal ${t === 'up' ? 'text-safe' : 'text-crimson-ink'}`}>{t === 'up' ? '↑ تحسّن' : '↓ تراجع'}</span>}
              </span>
              {editing ? (
                <div role="radiogroup" aria-label={SKILL_LABEL[s]} className="flex gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={draft[s] === n} aria-label={`${SKILL_LABEL[s]} ${n}: ${SCORE_LABEL[n]}`} onClick={() => setDraft({ ...draft, [s]: n })} className={`num grid size-11 place-items-center rounded-xl border text-sm ${draft[s] === n ? 'border-pulse bg-pulse/20 text-pulse' : 'border-white/15 text-mute'}`}>{n}</button>
                  ))}
                </div>
              ) : l ? <span className="flex items-center gap-2"><Meter score={l.score} i={i} /><span className="num w-4 text-sm">{l.score}</span></span> : <span className="text-xs text-mute">غير مقيّم</span>}
            </li>
          )
        })}
      </ul>
      {err && <p role="alert" className="text-sm text-crimson-ink">{err}</p>}
      {editing && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || Object.keys(draft).length === 0} onClick={save} className={btn}>احفظ التقييم</button>
          <button type="button" onClick={() => setEditing(false)} className={ghost}>إلغاء</button>
        </div>
      )}
    </article>
  )
}

function Goals({ player, data, canAssess, userId, reload }: { player: DevPlayer; data: DevData; canAssess: boolean; userId: string; reload: () => void }) {
  const skills = skillsFor(player.pos)
  const latest = latestScores(data.assessments[player.id] ?? [])
  const goals = (data.goals[player.id] ?? []).filter((g) => !g.done)
  const [v, setV] = useState({ skill: skills[0], target: '4', dueOn: '' })
  const [err, setErr] = useState<string | null>(null)
  async function add(e: FormEvent) {
    e.preventDefault()
    if (!v.dueOn || v.dueOn < today()) return setErr('اختر تاريخ مستقبلي للهدف')
    setErr(null)
    try { await addGoal(userId, player.id, { skill: v.skill, target: Number(v.target), dueOn: v.dueOn }); setV({ ...v, dueOn: '' }); reload() }
    catch (x) { setErr(x instanceof Error && x.message === 'goal_limit' ? 'أقصى 3 أهداف مفتوحة للاعب. أنهِ هدف أول.' : 'ما انضاف الهدف. حاول مرة ثانية.') }
  }
  return (
    <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 3 })}>
      <h2 className="font-display text-2xl">الأهداف <span className="num text-lg text-mute">({goals.length}/3)</span></h2>
      {goals.length === 0 && <p className="text-sm text-mute">ما فيه أهداف مفتوحة. حدّد هدف واحد واضح أفضل من عشرة.</p>}
      <ul className="space-y-2">
        {goals.map((g) => {
          const p = goalProgress(g, latest)
          return (
            <li key={g.id} className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><b>{SKILL_LABEL[g.skill]}: من {p.now || '—'} إلى {g.target}</b><span className="text-xs text-mute">قبل <span className="num">{fmtDate(g.dueOn)}</span></span></div>
              <div role="img" aria-label={`التقدم ${Math.round(p.pct * 100)}%`} className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`grow h-full rounded-full ${p.reached ? 'bg-safe' : 'bg-pulse'}`} style={{ width: `${p.pct * 100}%` }} /></div>
              {canAssess && <div className="flex gap-2"><button type="button" onClick={async () => { await finishGoal(player.id, g.id); reload() }} className={ghost}>{p.reached ? 'تحقق: أنهِه' : 'أنهِه'}</button><button type="button" onClick={async () => { await removeGoal(player.id, g.id); reload() }} className={ghost}>احذفه</button></div>}
            </li>
          )
        })}
      </ul>
      {canAssess && goals.length < 3 && (
        <form onSubmit={add} className="grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-4">
          <label className="block space-y-1"><span className="text-xs text-mute">المهارة</span><select id="goalSkill" value={v.skill} onChange={(e) => setV({ ...v, skill: e.target.value as SkillId })} className={field}>{skills.map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}</select></label>
          <label className="block space-y-1"><span className="text-xs text-mute">الهدف (1–5)</span><select id="goalTarget" value={v.target} onChange={(e) => setV({ ...v, target: e.target.value })} className={field}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} · {SCORE_LABEL[n]}</option>)}</select></label>
          <label className="block space-y-1"><span className="text-xs text-mute">قبل تاريخ</span><input id="goalDue" type="date" dir="ltr" value={v.dueOn} onChange={(e) => setV({ ...v, dueOn: e.target.value })} className={field} /></label>
          <div className="flex items-end"><button className={`${btn} w-full`}>أضف هدف</button></div>
          {err && <p role="alert" className="text-sm text-crimson-ink sm:col-span-4">{err}</p>}
        </form>
      )}
    </article>
  )
}

function Plan({ player, data, zone }: { player: DevPlayer; data: DevData; zone: ReturnType<typeof loadFromLogs>['zone'] }) {
  const [match, setMatch] = useState(() => { try { return localStorage.getItem('sh.nextMatch') || nextSaturday() } catch { return nextSaturday() } })
  const latest = latestScores(data.assessments[player.id] ?? [])
  const plan = useMemo(() => weekPlan({ matchDay: match, pos: player.pos, status: player.status, latest, zone }), [match, player.pos, player.status, latest, zone])
  const [open, setOpen] = useState<number | null>(null)
  const gk = isGoalkeeper(player.pos)
  return (
    <article className="glass rise min-w-0 space-y-3 p-4 md:p-5 lg:col-span-2" style={vars({ '--i': 4 })}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-2xl">خطة الأسبوع حول المباراة</h2><p className="text-xs text-mute">إرشادية من علوم التدريب: المدرب يعدّلها. الأرقام تنزل 30–40% لو الحمل عالي أو فيه ألم.</p></div>
        <label className="block space-y-1"><span className="text-xs text-mute">تاريخ المباراة</span>
          <input id="matchDay" type="date" dir="ltr" value={match} onChange={(e) => { setMatch(e.target.value); try { localStorage.setItem('sh.nextMatch', e.target.value) } catch { /* session-only */ } }} className={`${field} w-44`} /></label>
      </div>
      {plan.blocked ? <p role="status" className="rounded-xl border border-crimson/40 bg-crimson/10 p-3 text-sm">{plan.blocked}</p> : (
        <>
          {plan.reduced && <p role="status" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">حمل اللاعب مرتفع: نزّلنا الحجم والشدة حوالي الثلث. القرار للمدرب والطبيب.</p>}
          <ol className="flex snap-x gap-2 overflow-x-auto pb-2">
            {plan.days.map((d, i) => (
              <li key={d.label} className={`snap-start ${open === d.offset ? 'w-72' : 'w-44'} shrink-0 transition-[width] duration-300`}>
                <button type="button" aria-expanded={open === d.offset} onClick={() => setOpen(open === d.offset ? null : d.offset)} className={`row-in flex min-h-11 w-full flex-col gap-1 rounded-xl border px-3 py-2 text-start ${d.today ? 'border-pulse bg-pulse/10' : d.past ? 'border-dashed border-white/15 bg-transparent' : 'border-white/10 bg-white/[0.03]'}`} style={vars({ '--i': i })}>
                  <span className="flex items-center justify-between"><b className="num font-display text-xl">{d.label}</b>{d.today && <span className="rounded-full bg-pulse/20 px-2 text-xs text-pulse">اليوم</span>}{d.past && <span className="rounded-full bg-white/10 px-2 text-xs text-mute">مضى</span>}</span>
                  <span className="num text-xs text-mute">{fmtDate(d.date)}</span>
                  <span className="text-sm">{d.name}</span>
                  <span className={`w-fit rounded-full px-2 py-0.5 text-xs ${INTENSITY[d.intensity].cls}`}>{INTENSITY[d.intensity].label} · RPE <span className="num">{d.rpe[0]}–{d.rpe[1]}</span></span>
                </button>
                {open === d.offset && (
                  <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                    <p className="text-xs text-mute">المدة <span className="num">{d.minutes}</span> دقيقة{gk && d.dives && <> · ارتماءات <span className="num">{d.dives[0]}–{d.dives[1]}</span></>}</p>
                    {d.blocks.length > 0 && <div><p className="text-xs text-mute">{d.offset === -4 ? 'قوة' : d.offset === -3 ? 'بلايومتريكس' : 'وقاية'}</p><ul className="list-disc space-y-0.5 ps-5">{d.blocks.map((b) => <li key={b}>{b}</li>)}</ul></div>}
                    {d.drills.length > 0 ? <div><p className="text-xs text-mute">تمارين مقترحة</p><ul className="space-y-1">{d.drills.map((x) => <li key={x.id}><b>{x.name}</b><span className="block text-xs text-mute">{x.dose}</span></li>)}</ul></div> : d.blocks.length === 0 && <p className="text-xs text-mute">بدون تمارين محددة هذا اليوم.</p>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </article>
  )
}

function Sessions({ player, data, userId, reload }: { player: DevPlayer; data: DevData; userId: string; reload: () => void }) {
  const logs = data.logs[player.id] ?? []
  const [v, setV] = useState({ day: today(), minutes: '70', rpe: '6' })
  const [err, setErr] = useState<string | null>(null)
  async function add(e: FormEvent) {
    e.preventDefault()
    const m = Number(v.minutes), r = Number(v.rpe)
    if (!(m >= 1 && m <= 300) || !(r >= 1 && r <= 10) || !v.day || v.day > today()) return setErr('الدقائق 1–300، الجهد (RPE) 1–10، والتاريخ ما يكون بالمستقبل')
    setErr(null)
    try { await logSession(userId, player.id, { day: v.day, minutes: m, rpe: r }); reload() } catch { setErr('ما انسجلت الجلسة. حاول مرة ثانية.') }
  }
  const recent = [...logs].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 7)
  return (
    <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 5 })}>
      <h2 className="font-display text-2xl">سجل الجلسات</h2>
      <p className="text-xs text-mute">حمل الجلسة = الدقائق × جهد اللاعب (RPE 1–10). يغذّي مؤشر الحمل فوق.</p>
      <form onSubmit={add} className="grid grid-cols-3 gap-2">
        <label className="block space-y-1"><span className="text-xs text-mute">اليوم</span><input id="logDay" type="date" dir="ltr" value={v.day} max={today()} onChange={(e) => setV({ ...v, day: e.target.value })} className={field} /></label>
        <label className="block space-y-1"><span className="text-xs text-mute">دقائق</span><input id="logMin" inputMode="numeric" dir="ltr" value={v.minutes} onChange={(e) => setV({ ...v, minutes: e.target.value })} className={field} /></label>
        <label className="block space-y-1"><span className="text-xs text-mute">RPE</span><input id="logRpe" inputMode="numeric" dir="ltr" value={v.rpe} onChange={(e) => setV({ ...v, rpe: e.target.value })} className={field} /></label>
        <button className={`${btn} col-span-3`}>سجّل الجلسة</button>
      </form>
      {err && <p role="alert" className="text-sm text-crimson-ink">{err}</p>}
      {recent.length > 0 && <ul className="divide-y divide-white/10 text-sm">{recent.map((l) => <li key={l.day} className="flex items-center justify-between py-1.5"><span className="num">{fmtDate(l.day)}</span><span className="num text-mute">{l.minutes} د × RPE {l.rpe} = <b className="text-ink">{l.minutes * l.rpe}</b></span></li>)}</ul>}
    </article>
  )
}

export function Development() {
  const { user } = useAuth()
  const load = useLoad(() => getDevelopment(user!.id), [user?.id])
  const [sel, setSel] = useState<string | null>(null)
  const [kind, setKind] = useState<'all' | 'gk' | 'out'>('all')
  if (load.error instanceof Error && load.error.message === 'no-club') return <section className="space-y-4"><PageTitle>غرفة التطوير</PageTitle><p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد.</p></section>
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data) return <Failed retry={load.reload} />

  const { data, demo } = load.data
  const canAssess = user!.role === 'club_admin'
  const gks = data.players.filter((p) => isGoalkeeper(p.pos))
  const shown = kind === 'all' ? [...gks, ...data.players.filter((p) => !isGoalkeeper(p.pos))] : kind === 'gk' ? gks : data.players.filter((p) => !isGoalkeeper(p.pos))
  const player = data.players.find((p) => p.id === sel) ?? shown[0] ?? null
  const load28 = player ? loadFromLogs(data.logs[player.id] ?? []) : null

  return (
    <section className="space-y-5 md:space-y-6">
      <PageTitle>غرفة التطوير</PageTitle>
      <p className="glass rise flex items-start gap-3 p-4 text-sm" style={vars({ '--i': 1 })}>
        <Icon name="bolt" className="mt-0.5 size-5 shrink-0 text-pulse" />
        <span>تقييم، أهداف، وخطة أسبوع حول المباراة، للحراس واللاعبين. <b>التقييم رأي المدرب مو قياس</b>، والتمارين إرشادية، ومؤشر الحمل يساعد الطبيب مو تشخيص.</span>
      </p>

      {data.players.length === 0 ? (
        <p className="glass p-5 text-mute">ما فيه لاعبين بناديك للحين. استوردهم من مركز البيانات.</p>
      ) : (
        <>
          <div className="space-y-2">
            <Segmented label="نوع اللاعب" value={kind} onChange={setKind} options={[{ key: 'all', label: 'الكل', count: data.players.length }, { key: 'gk', label: 'الحراس', count: gks.length }, { key: 'out', label: 'اللاعبون', count: data.players.length - gks.length }]} />
            <div role="group" aria-label="اللاعب" className="flex flex-wrap gap-2">
              {shown.map((p) => (
                <button key={p.id} type="button" aria-pressed={player?.id === p.id} onClick={() => setSel(p.id)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm transition-colors ${player?.id === p.id ? 'border-pulse bg-pulse/10 text-pulse' : 'border-white/10 text-mute hover:text-ink'}`}>
                  <span className="num font-display text-lg leading-none">{p.num ?? '—'}</span><span>{p.name}</span>{isGoalkeeper(p.pos) && <span aria-hidden>🧤</span>}
                </button>
              ))}
            </div>
          </div>

          {player && load28 && (
            <div key={player.id} className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
              <article className="glass rise flex flex-wrap items-center gap-4 p-4 md:p-5 lg:col-span-2" style={vars({ '--i': 1 })}>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-3xl">{player.name}</h2>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-mute"><span>{player.pos}</span><span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS[player.status].cls}`}>{STATUS[player.status].label}</span></p>
                </div>
                {load28.ratio !== null && load28.zone ? (
                  <div className="flex items-center gap-3"><Gauge ratio={load28.ratio} zone={load28.zone} label={`مؤشر الحمل ${load28.ratio}: ${ZONE_TEXT[load28.zone]}`} /><p className="text-sm"><b>{ZONE_TEXT[load28.zone]}</b><span className="block text-xs text-mute">يساعد الطبيب، مو تشخيص</span></p></div>
                ) : <p className="max-w-56 text-xs text-mute">مؤشر الحمل يحتاج 28 يوم سجل جلسات. ناقص <span className="num">{load28.missing}</span> يوم.</p>}
              </article>
              <Skills player={player} data={data} canAssess={canAssess} userId={user!.id} reload={load.reload} />
              <Goals player={player} data={data} canAssess={canAssess} userId={user!.id} reload={load.reload} />
              <Plan player={player} data={data} zone={load28.zone} />
              <Sessions player={player} data={data} userId={user!.id} reload={load.reload} />
            </div>
          )}
        </>
      )}
      {demo && <DemoNote text="* لاعبون وتقييمات وسجلات خيالية للعرض، مو بيانات حقيقية. الأندية خيالية." />}
    </section>
  )
}
