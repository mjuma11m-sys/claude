import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { DemoNote } from '../components/DemoNote'
import { Icon } from '../components/Icon'
import { PageTitle } from '../components/PageTitle'
import { Segmented } from '../components/Segmented'
import { Failed, Loading } from '../components/States'
import { getDataCenter } from '../data/datacenter'
import { closeRequest, exportPlayer, fulfilWithdrawal, getRights, logRequest, saveWageMonth, type ActResult } from '../data/rights'
import { getClubRoom, type SquadRow } from '../data/source'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import { daysLeft } from '../lib/contracts'
import { fmtDate } from '../lib/format'
import {
  describeDue, endingSoon, isLate, tracked, KIND_ACT, KIND_HELP, KIND_TEXT, KINDS, lastMonths, lateFirst, sortRequests, urgency,
  type Request, type RKind,
} from '../lib/rights'

const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'
const btn = 'min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink disabled:opacity-60'
const ghost = 'min-h-11 rounded-xl border border-white/15 px-4 text-sm disabled:opacity-60'
const danger = 'min-h-11 rounded-xl border border-crimson-ink px-4 text-sm font-bold text-crimson-ink disabled:opacity-60'
const TONE = { late: 'border-crimson-ink bg-crimson/20 text-crimson-ink', soon: 'border-warn bg-warn/20 text-warn', ok: 'border-safe bg-safe/20 text-safe', done: 'border-white/15 text-mute' } as const
const todayIso = () => new Date().toISOString().slice(0, 10)
const ERR: Record<string, string> = {
  already_open: 'فيه طلب مفتوح من هالنوع لنفس اللاعب.', bad_date: 'التاريخ لازم يكون من آخر سنة وبدون مستقبل.', export_first: 'صدّر النسخة أول، ثم سكّر الطلب.',
  use_withdrawal: 'طلب السحب يتسكر بتنفيذ الحذف.', already_closed: 'الطلب مسكّر.', bad_month: 'الشهر خارج المسموح (آخر 12 شهر).', unknown_player: 'لاعب مو من ناديك أو بلا عقد.',
}
const explain = (r: Extract<ActResult, { ok: false }>) => r.errors.map((e) => ERR[e.code] ?? e.code).join('، ')

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type Who = { id: string; num: number | null; name: string }

function RequestCard({ r, who, userId, onDone, i }: { r: Request; who: Who | null; userId: string; onDone: () => void; i: number }) {
  const u = urgency(r)
  const [confirm, setConfirm] = useState<'export' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  async function run(f: () => Promise<void>) { setBusy(true); setMsg(null); try { await f() } catch { setMsg('ما تمت العملية. تأكد من الاتصال وحاول مرة ثانية.') } finally { setBusy(false); setConfirm(null) } }
  const doExport = () => run(async () => { if (!who) return; download(`player-${who.num ?? 'x'}-${todayIso()}.json`, await exportPlayer(userId, who.id, r.id)); onDone() })
  const doClose = () => run(async () => { const res = await closeRequest(r.id); if (res.ok) onDone(); else setMsg(explain(res)) })
  const doDelete = () => run(async () => { await fulfilWithdrawal(r.id); onDone() })
  return (
    <li data-request={r.kind} data-tone={u.tone} className="row-in space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" style={vars({ '--i': Math.min(i, 10) })}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">{KIND_TEXT[r.kind]} · {who ? <><span className="num text-mute">{who.num ?? '—'}</span> {who.name}</> : <span className="text-mute">لاعب محذوف · <bdi dir="ltr" className="num">{r.consentRef}</bdi></span>}</span>
        <span className={`rounded-full border px-3 py-0.5 text-xs ${TONE[u.tone]}`}>{r.status === 'done' ? `سُكّر ${fmtDate(r.closedOn!)}` : describeDue(u.days)}</span>
      </div>
      <p className="text-xs text-mute">استلمته <span className="num">{fmtDate(r.receivedOn)}</span> · مهلتك الداخلية <span className="num">{fmtDate(r.dueOn)}</span>{r.exportedAt && <> · صُدّرت النسخة</>}</p>
      {r.status === 'open' && who && (
        <>
          <p className="text-sm">{KIND_HELP[r.kind]}</p>
          {confirm === 'export' && <p role="alert" className="rounded-xl border border-warn/40 bg-warn/10 p-2 text-sm">الملف فيه بيانات حساسة (حضور، تقييم، صحة، راتب). سلّمه للاعب بنفسك ولا ترسله بقناة مفتوحة، ولا تخزنه عندك بدون حاجة. التطبيق ما يحفظ نسخة منه.</p>}
          {confirm === 'delete' && <p role="alert" className="rounded-xl border border-crimson-ink/60 bg-crimson/10 p-2 text-sm">راح يتحذف <b>{who.name}</b> مع راتبه وعقده وحالته وحضوره وتطويره وتشكيلاته. <b>ما يرجع.</b> أحداث المباريات تبقى بدون اسمه.</p>}
          <div className="flex flex-wrap gap-2">
            {r.kind === 'access' && (confirm === 'export'
              ? <><button type="button" onClick={doExport} disabled={busy} className={btn}>نزّل الملف</button><button type="button" onClick={() => setConfirm(null)} className={ghost}>ألغ</button></>
              : <button type="button" onClick={() => setConfirm('export')} className={btn}>{KIND_ACT.access}</button>)}
            {r.kind === 'access' && r.exportedAt && <button type="button" onClick={doClose} disabled={busy} className={ghost}>سكّر الطلب</button>}
            {r.kind === 'withdraw' && (confirm === 'delete'
              ? <><button type="button" onClick={doDelete} disabled={busy} className={danger}>أكّد الحذف</button><button type="button" onClick={() => setConfirm(null)} className={ghost}>ألغ</button></>
              : <button type="button" onClick={() => setConfirm('delete')} className={danger}>{KIND_ACT.withdraw}</button>)}
            {(r.kind === 'correct' || r.kind === 'object') && <button type="button" onClick={doClose} disabled={busy} className={btn}>{KIND_ACT[r.kind]}</button>}
          </div>
        </>
      )}
      {msg && <p role="status" className="text-sm text-crimson-ink">{msg}</p>}
    </li>
  )
}

function Requests({ squad, requests, userId, reload }: { squad: Who[]; requests: Request[]; userId: string; reload: () => void }) {
  const [player, setPlayer] = useState(squad[0]?.id ?? '')
  const [kind, setKind] = useState<RKind>('access')
  const [day, setDay] = useState(todayIso)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const by = new Map(squad.map((p) => [p.id, p]))
  const sorted = sortRequests(requests)
  async function add() {
    const p = by.get(player); if (!p) return
    setBusy(true); setMsg(null)
    try { const r = await logRequest(p, kind, day); if (r.ok) { setMsg({ ok: true, text: 'انسجل الطلب' }); reload() } else setMsg({ ok: false, text: explain(r) }) }
    catch { setMsg({ ok: false, text: 'ما انحفظ. تأكد من الاتصال وحاول مرة ثانية.' }) } finally { setBusy(false) }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 2 })}>
        <h2 className="font-display text-2xl">سجّل طلب لاعب</h2>
        <label className="block space-y-1"><span className="text-xs text-mute">اللاعب</span>
          <select id="rqPlayer" value={player} onChange={(e) => setPlayer(e.target.value)} className={field}>{squad.map((p) => <option key={p.id} value={p.id}>{p.num ?? '—'} · {p.name}</option>)}</select></label>
        <label className="block space-y-1"><span className="text-xs text-mute">نوع الطلب</span>
          <select id="rqKind" value={kind} onChange={(e) => setKind(e.target.value as RKind)} className={field}>{KINDS.map((k) => <option key={k} value={k}>{KIND_TEXT[k]}</option>)}</select></label>
        <label className="block space-y-1"><span className="text-xs text-mute">تاريخ استلام الطلب</span>
          <input id="rqDay" type="date" dir="ltr" value={day} max={todayIso()} onChange={(e) => setDay(e.target.value)} className={field} /></label>
        <p className="text-xs text-mute">{KIND_HELP[kind]}</p>
        <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={add} disabled={busy || !player} className={btn}>سجّل الطلب</button>{msg && <span role="status" className={`text-sm ${msg.ok ? 'text-safe' : 'text-crimson-ink'}`}>{msg.text}</span>}</div>
      </article>
      <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 3 })}>
        <h2 className="font-display text-2xl">الطلبات</h2>
        {sorted.length === 0 ? <p className="text-sm text-mute">ما فيه طلبات مسجّلة.</p> : (
          <ul className="space-y-2">{sorted.slice(0, 20).map((r, i) => <RequestCard key={r.id} r={r} who={r.playerId ? by.get(r.playerId) ?? null : null} userId={userId} onDone={reload} i={i} />)}</ul>
        )}
      </article>
    </div>
  )
}

function Pay({ squad, paid, graceDays, agreement, reload }: { squad: SquadRow[]; paid: Record<string, Record<string, string>>; graceDays: number; agreement: boolean; reload: () => void }) {
  const [older, setOlder] = useState(false)
  const months = lastMonths(older ? 6 : 2)
  const [month, setMonth] = useState(months[0])
  const [edit, setEdit] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const saved = paid[month] ?? {}
  const rows = useMemo(() => lateFirst(squad, saved, month, new Date(), graceDays), [squad, saved, month, graceDays])
  const state = (id: string): string | null => (id in edit ? edit[id] : saved[id] ?? null)
  const changed = Object.keys(edit).length > 0
  const ending = endingSoon(squad)
  if (!agreement) return <p className="glass p-5 text-mute">سجل الرواتب يحتاج اتفاقية معالجة بيانات فعّالة. <Link to="/data" className="text-pulse underline">افتح مركز البيانات</Link></p>
  async function save() {
    setBusy(true); setMsg(null)
    try {
      const r = await saveWageMonth(month, Object.fromEntries(rows.map((p) => [p.id, state(p.id)])))
      if (r.ok) { setMsg({ ok: true, text: 'انحفظ الشهر' }); setEdit({}); reload() } else setMsg({ ok: false, text: explain(r) })
    } catch { setMsg({ ok: false, text: 'ما انحفظ. تأكد من الاتصال وحاول مرة ثانية.' }) } finally { setBusy(false) }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 2 })}>
        <h2 className="font-display text-2xl">سجل الرواتب</h2>
        <div role="group" aria-label="الشهر" className="flex flex-wrap gap-2">
          {months.map((m) => <button key={m} type="button" aria-pressed={m === month} onClick={() => { setMonth(m); setEdit({}); setMsg(null) }} className={`min-h-11 rounded-xl border px-3 text-sm ${m === month ? 'border-pulse bg-pulse/15 text-pulse' : 'border-white/15 text-mute'}`}><bdi dir="ltr" className="num">{m.slice(0, 7)}</bdi></button>)}
          {!older && <button type="button" onClick={() => setOlder(true)} className={ghost}>شهر أقدم</button>}
        </div>
        <p className="text-xs text-mute">تسجيل من النادي بتاريخ الصرف، بدون مبالغ (المبلغ بالعقد). مو إثبات دفع. التأخر يُحسب للشهر اللي بدأت تسجّل فيه، وهو بعد نهاية الشهر بأكثر من <span className="num">{graceDays}</span> يوم (قيمة تجريبية، العقد يحدد).</p>
        <ul className="divide-y divide-white/10">
          {rows.map((p) => { const v = state(p.id); const late = tracked(saved) && isLate(month, !!v, p.endsOn, new Date(), graceDays); return (
            <li key={p.id} data-pay={p.num} data-late={late} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate"><span className="num text-mute">{p.num ?? '—'}</span> {p.name}{late && <span className="ms-2 rounded-full bg-crimson/20 px-2 py-0.5 text-xs text-crimson-ink">متأخر</span>}</span>
              <button type="button" aria-pressed={!!v} aria-label={`انصرف راتب ${p.name}`} onClick={() => { setEdit({ ...edit, [p.id]: v ? null : todayIso() }); setMsg(null) }} className={`min-h-11 min-w-24 rounded-xl border px-3 text-sm ${v ? 'border-safe bg-safe/20 text-safe' : 'border-white/15 text-mute'}`}>{v ? <>انصرف <bdi dir="ltr" className="num text-xs">{v.slice(5)}</bdi></> : 'ما انصرف'}</button>
            </li>) })}
        </ul>
        <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={save} disabled={busy || !changed} className={btn}>احفظ الشهر</button>{msg && <span role="status" className={`text-sm ${msg.ok ? 'text-safe' : 'text-crimson-ink'}`}>{msg.text}</span>}</div>
      </article>
      <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 3 })}>
        <h2 className="font-display text-2xl">عقود تنتهي خلال 90 يوم</h2>
        <p className="text-xs text-mute">تذكير لك مو التزام قانوني: قرر وأبلغ اللاعب بدري.</p>
        {ending.length === 0 ? <p className="text-sm text-mute">ما فيه عقود قريبة الانتهاء.</p> : (
          <ul className="divide-y divide-white/10">{ending.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><span className="num text-mute">{p.num ?? '—'}</span> {p.name}</span><span className="text-sm text-warn">بعد <span className="num">{daysLeft(p.endsOn)}</span> يوم · <span className="num">{fmtDate(p.endsOn)}</span></span></li>)}</ul>
        )}
      </article>
    </div>
  )
}

export function Rights() {
  const { user } = useAuth()
  const load = useLoad(async () => {
    const [room, dc, rights] = await Promise.all([getClubRoom(user!.id), getDataCenter(user!.id), getRights(user!.id)])
    return { room, dc, rights }
  }, [user?.id])
  const [tab, setTab] = useState<'requests' | 'pay'>('requests')

  if (load.error instanceof Error && load.error.message === 'no-club') return <section className="space-y-4"><PageTitle>حقوق اللاعبين</PageTitle><p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد.</p></section>
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data) return <Failed retry={load.reload} />
  const { room, dc, rights } = load.data
  const squad = room.data.squad.filter((p) => !rights.removed.includes(p.id))
  const open = rights.requests.filter((r) => r.status === 'open')
  const late = open.filter((r) => urgency(r).tone === 'late').length

  return (
    <section className="space-y-5 md:space-y-6">
      <PageTitle>طلبات اللاعبين وحقوقهم</PageTitle>
      <p className="glass rise flex items-start gap-3 p-4 text-sm" style={vars({ '--i': 1 })}>
        <Icon name="user" className="mt-0.5 size-5 shrink-0 text-pulse" />
        <span>اللاعب ما عنده حساب بالتطبيق، فالنادي هو اللي <b>يسجّل طلبه ويستجيب له</b>. المهل هنا أهداف داخلية قابلة للتعديل ({rights.requestDays} يوم)، <b>مو صياغة قانونية</b>: راجعها مع محامٍ مرخّص قبل ما تعتمد عليها.</span>
      </p>
      <Segmented label="القسم" value={tab} onChange={setTab} options={[{ key: 'requests', label: 'بيانات اللاعب', count: open.length }, { key: 'pay', label: 'الرواتب والعقد' }]} />
      {late > 0 && tab === 'requests' && <p role="status" className="rounded-xl border border-crimson-ink/60 bg-crimson/10 p-3 text-sm">طلبات تعدّت مهلتها الداخلية: <b className="num">{late}</b></p>}
      {squad.length === 0 ? <p className="glass p-5 text-mute">ما فيه لاعبين بناديك للحين. استوردهم من مركز البيانات.</p>
        : tab === 'requests' ? <Requests squad={squad} requests={rights.requests} userId={user!.id} reload={load.reload} />
        : <Pay squad={squad} paid={rights.paid} graceDays={rights.graceDays} agreement={dc.agreement !== null} reload={load.reload} />}
      {room.demo && <DemoNote text="* لاعبون وطلبات ورواتب خيالية للعرض، مو بيانات حقيقية. الأندية خيالية." />}
    </section>
  )
}
