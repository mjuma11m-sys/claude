import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { DemoNote } from '../components/DemoNote'
import { Icon } from '../components/Icon'
import { PageTitle } from '../components/PageTitle'
import { Failed, Loading } from '../components/States'
import { getClubRoom } from '../data/source'
import { getDataCenter, importSquad, recordAgreement, revokeAgreement, withdrawConsent, type DataCenter as DC } from '../data/datacenter'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import { fmtDate, fmtMoney } from '../lib/format'
import { DPA_TEMPLATE, DPA_VERSION } from '../lib/dpa-template'
import { ERROR_TEXT, FIELD_TEXT, parseSquadCsv, TEMPLATE_CSV, type CsvError, type ImportRow } from '../lib/squad-csv'

const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'
const btn = 'min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink disabled:opacity-60'
const ghost = 'min-h-11 rounded-xl border border-white/15 px-5 text-sm'

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

function Step({ n, title, state, children }: { n: number; title: string; state: 'done' | 'current' | 'locked'; children: React.ReactNode }) {
  return (
    <li aria-current={state === 'current' ? 'step' : undefined} className={`glass rise space-y-3 p-4 md:p-5 ${state === 'locked' ? 'opacity-60' : ''}`} style={vars({ '--i': n + 1 })}>
      <h2 className="flex items-center gap-3 font-display text-2xl">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full text-lg ${state === 'done' ? 'bg-safe/20 text-safe' : state === 'current' ? 'bg-pulse/20 text-pulse' : 'bg-white/10 text-mute'}`}>
          {state === 'done' ? <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path className="draw" d="M5 12.5l4.5 4.5L19 7.5" /></svg> : <span className="num">{n}</span>}
        </span>
        {title}
        <span className="sr-only">{state === 'done' ? ' (تم)' : state === 'locked' ? ' (مقفول)' : ''}</span>
      </h2>
      {children}
    </li>
  )
}

function AgreementForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [v, setV] = useState({ signatory: '', title: '', reference: '', signedOn: new Date().toISOString().slice(0, 10), ack: false })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof v) => (e: { target: { value: string; checked?: boolean; type?: string } }) => setV({ ...v, [k]: k === 'ack' ? !!e.target.checked : e.target.value })
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (v.signatory.trim().length < 2 || v.title.trim().length < 2 || v.reference.trim().length < 3) return setErr('اكتب اسم الموقّع ومسماه ومرجع الوثيقة (3 أحرف على الأقل)')
    if (v.signedOn > new Date().toISOString().slice(0, 10)) return setErr('تاريخ التوقيع ما يكون بالمستقبل')
    if (!v.ack) return setErr('لازم تقرّ إن نسخة موقّعة محفوظة عندكم')
    setErr(null); setBusy(true)
    try { await recordAgreement(userId, { version: DPA_VERSION, signatory: v.signatory.trim(), title: v.title.trim(), reference: v.reference.trim(), signedOn: v.signedOn }); onDone() }
    catch { setErr('ما انحفظت الاتفاقية. تأكد من الاتصال وحاول مرة ثانية') }
    finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1"><span className="text-xs text-mute">اسم الموقّع عن النادي</span><input id="signatory" value={v.signatory} onChange={set('signatory')} className={field} /></label>
        <label className="block space-y-1"><span className="text-xs text-mute">المسمى</span><input id="title" value={v.title} onChange={set('title')} className={field} /></label>
        <label className="block space-y-1"><span className="text-xs text-mute">مرجع الوثيقة الموقّعة</span><input id="reference" dir="ltr" value={v.reference} onChange={set('reference')} className={field} placeholder="DPA-2026-001" /></label>
        <label className="block space-y-1"><span className="text-xs text-mute">تاريخ التوقيع</span><input id="signedOn" type="date" dir="ltr" value={v.signedOn} onChange={set('signedOn')} className={field} /></label>
      </div>
      <label className="flex min-h-11 items-start gap-3 text-sm"><input id="ack" type="checkbox" checked={v.ack} onChange={set('ack')} className="mt-1 size-5" /><span>أقرّ إن عندنا نسخة موقّعة من الاتفاقية، وإن مراجعتها القانونية تمّت عندنا. التطبيق يحفظ اسم الموقّع ومرجع الوثيقة، مو الوثيقة نفسها.</span></label>
      {err && <p role="alert" className="text-sm text-crimson-ink">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} className={btn}>سجّل الاتفاقية</button>
        <button type="button" onClick={() => download('dpa-draft.txt', DPA_TEMPLATE)} className={ghost}>حمّل المسودة (للمراجعة القانونية)</button>
      </div>
    </form>
  )
}

function ImportPanel({ onDone, demo }: { onDone: () => void; demo: boolean }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [errors, setErrors] = useState<CsvError[]>([])
  const [fileName, setFileName] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function pick(f: File | undefined) {
    setFail(null); setDone(null); setConfirming(false)
    if (!f) return
    setFileName(f.name)
    const r = parseSquadCsv(await f.text())
    setRows(r.errors.length ? null : r.rows); setErrors(r.errors)
  }
  async function send() {
    if (!rows) return
    setBusy(true); setFail(null)
    try {
      const res = await importSquad(rows)
      if (res.ok) { setDone(res.players); setRows(null); setConfirming(false); onDone() }
      else { setErrors(res.errors); setRows(null); setConfirming(false) }
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setFail(m === 'dpa_required' ? 'الاتفاقية غير مسجّلة أو انسحبت. سجّلها بالخطوة 1 أول.' : 'ما تم الاستيراد. تأكد من الاتصال وحاول مرة ثانية.')
    } finally { setBusy(false) }
  }

  const total = rows?.reduce((a, r) => a + r.monthly_wage_bhd, 0) ?? 0
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} id="csv" type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        <button type="button" onClick={() => input.current?.click()} className={btn}>اختر ملف CSV</button>
        <button type="button" onClick={() => download('squad-template.csv', TEMPLATE_CSV)} className={ghost}>حمّل القالب</button>
        {fileName && <span className="num text-xs text-mute" dir="ltr">{fileName}</span>}
      </div>
      {errors.length > 0 && (
        <div role="alert" className="space-y-2 rounded-xl border border-crimson/40 bg-crimson/10 p-3 text-sm">
          <p className="font-bold">ما انقبل الملف. صحّح هالأخطاء وارفعه مرة ثانية (ما انكتب أي شي):</p>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {errors.slice(0, 40).map((e, i) => (
              <li key={i} className="flex gap-2"><span className="num shrink-0 text-crimson-ink">{e.row ? `سطر ${e.row + 1}` : 'الملف'}</span><span>{FIELD_TEXT[e.field] ?? e.field}: {ERROR_TEXT[e.code] ?? e.code}</span></li>
            ))}
          </ul>
          {errors.length > 40 && <p className="text-xs text-mute">وفيه {errors.length - 40} أخطاء ثانية.</p>}
        </div>
      )}
      {rows && (
        <div className="space-y-3">
          <p className="text-sm"><b className="num">{rows.length}</b> لاعب جاهزين للاستيراد · الرواتب <b className="num">{fmtMoney(total)}</b> / شهر</p>
          <div className="max-h-64 overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-start text-sm">
              <thead className="sticky top-0 bg-deep text-xs text-mute"><tr>{['الرقم', 'الاسم', 'المركز', 'الحالة', 'ينتهي', 'مرجع الموافقة'].map((h) => <th key={h} scope="col" className="px-3 py-2 text-start font-normal">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((r) => <tr key={r.num}><td className="num px-3 py-2">{r.num}</td><td className="px-3 py-2">{r.name}</td><td className="px-3 py-2">{r.pos}</td><td className="px-3 py-2">{r.status}</td><td className="num px-3 py-2">{fmtDate(r.ends_on)}</td><td className="num px-3 py-2" dir="ltr">{r.consent_ref}</td></tr>)}
              </tbody>
            </table>
          </div>
          {confirming ? (
            <div className="space-y-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
              <p>الاستيراد <b>يستبدل</b> تشكيلة ناديك الحالية كلها (اللاعبين وعقودهم وحالاتهم). {demo ? 'هذي تجربة داخل متصفحك فقط.' : 'ما يتراجع عنه إلا باستيراد ملف ثاني.'}</p>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={send} disabled={busy} className={btn}>أكّد الاستيراد</button><button type="button" onClick={() => setConfirming(false)} className={ghost}>رجوع</button></div>
            </div>
          ) : <button type="button" onClick={() => setConfirming(true)} className={btn}>استورد واستبدل التشكيلة</button>}
        </div>
      )}
      {fail && <p role="alert" className="text-sm text-crimson-ink">{fail}</p>}
      {done !== null && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-safe/10 p-3 text-sm text-safe">
          <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path className="draw" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          انستوردوا <b className="num">{done}</b> لاعب. <Link to="/club" className="underline underline-offset-4">افتح غرفة النادي</Link>
        </p>
      )}
    </div>
  )
}

function Withdraw({ userId, onDone }: { userId: string; onDone: () => void }) {
  const load = useLoad(() => getClubRoom(userId), [userId])
  const [id, setId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const squad = load.data?.data.squad ?? []
  if (squad.length === 0) return null
  const who = squad.find((p) => p.id === id)
  async function go() {
    setBusy(true); setErr(null)
    try { await withdrawConsent(id); setId(''); setConfirming(false); load.reload(); onDone() } catch { setErr('ما انسحبت الموافقة. حاول مرة ثانية.') } finally { setBusy(false) }
  }
  return (
    <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 6 })}>
      <h2 className="font-display text-2xl">سحب موافقة لاعب</h2>
      <p className="text-sm text-mute">لو لاعب سحب موافقته، نحذف راتبه وعقده وحالته من المنصة فوراً. يبقى سطر سجل بدون هوية.</p>
      <label className="block space-y-1"><span className="text-xs text-mute">اللاعب</span>
        <select id="withdraw" value={id} onChange={(e) => { setId(e.target.value); setConfirming(false) }} className={field}>
          <option value="">اختر لاعب</option>
          {squad.map((p) => <option key={p.id} value={p.id}>{p.num ?? '—'} · {p.name}</option>)}
        </select></label>
      {err && <p role="alert" className="text-sm text-crimson-ink">{err}</p>}
      {who && (confirming ? (
        <div className="space-y-3 rounded-xl border border-crimson/40 bg-crimson/10 p-3 text-sm">
          <p>بنحذف <b>{who.name}</b> وكل بياناته من المنصة. ما يتراجع عنه.</p>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={go} disabled={busy} className="min-h-11 rounded-xl bg-crimson px-5 text-sm font-bold text-white disabled:opacity-60">احذف بياناته</button><button type="button" onClick={() => setConfirming(false)} className={ghost}>رجوع</button></div>
        </div>
      ) : <button type="button" onClick={() => setConfirming(true)} className={ghost}>اسحب موافقته</button>)}
    </article>
  )
}

export function DataCenter() {
  const { user } = useAuth()
  const load = useLoad<DC>(() => getDataCenter(user!.id), [user?.id])
  const [revoking, setRevoking] = useState(false)
  if (load.error instanceof Error && load.error.message === 'no-club') {
    return <section className="space-y-4"><PageTitle>مركز البيانات</PageTitle><p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد.</p></section>
  }
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data) return <Failed retry={load.reload} />
  const dc = load.data
  const demo = !dc.connected
  const s1 = dc.agreement ? 'done' : 'current'
  const s2 = !dc.agreement ? 'locked' : dc.players > 0 ? 'done' : 'current'
  const s3 = !dc.agreement ? 'locked' : dc.players > 0 ? 'done' : 'current'

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>مركز البيانات</PageTitle>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${demo ? 'bg-warn/15 text-warn' : 'bg-safe/15 text-safe'}`}>
          <span aria-hidden className={`size-2 rounded-full ${demo ? 'bg-warn' : 'bg-safe'}`} />
          {demo ? 'تجربة داخل متصفحك: ما فيه قاعدة بيانات متصلة' : 'متصل بقاعدة البيانات'}
        </span>
      </div>
      <p className="glass rise flex items-start gap-3 p-4 text-sm" style={vars({ '--i': 1 })}>
        <Icon name="data" className="mt-0.5 size-5 shrink-0 text-pulse" />
        <span>ثلاث خطوات قبل أي بيانات حقيقية. <b>القاعدة نفسها ترفض الاستيراد</b> بدون اتفاقية مسجّلة ومرجع موافقة لكل لاعب، مو بس الواجهة.</span>
      </p>

      <ol className="space-y-4">
        <Step n={1} title="اتفاقية معالجة البيانات" state={s1}>
          {dc.agreement ? (
            <>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-mute">مرجع الوثيقة</dt><dd className="num font-bold" dir="ltr">{dc.agreement.reference}</dd></div>
                <div><dt className="text-xs text-mute">الموقّع</dt><dd className="font-bold">{dc.agreement.signatory} · {dc.agreement.title}</dd></div>
                <div><dt className="text-xs text-mute">تاريخ التوقيع</dt><dd className="num font-bold">{fmtDate(dc.agreement.signedOn)}</dd></div>
                <div><dt className="text-xs text-mute">نسخة المسودة</dt><dd className="num font-bold" dir="ltr">{dc.agreement.version}</dd></div>
              </dl>
              {revoking ? (
                <div className="space-y-3 rounded-xl border border-crimson/40 bg-crimson/10 p-3 text-sm">
                  <p>سحب الاتفاقية يوقف أي استيراد جديد، {demo ? 'ويمسح التجربة من متصفحك.' : 'وما يرجع يتفعّل؛ تحتاج تسجّل اتفاقية جديدة.'}</p>
                  <div className="flex flex-wrap gap-2"><button type="button" onClick={async () => { await revokeAgreement(user!.id); setRevoking(false); load.reload() }} className="min-h-11 rounded-xl bg-crimson px-5 text-sm font-bold text-white">اسحب الاتفاقية</button><button type="button" onClick={() => setRevoking(false)} className={ghost}>رجوع</button></div>
                </div>
              ) : <button type="button" onClick={() => setRevoking(true)} className={ghost}>اسحب الاتفاقية</button>}
            </>
          ) : <AgreementForm userId={user!.id} onDone={load.reload} />}
        </Step>

        <Step n={2} title="موافقات اللاعبين" state={s2}>
          <p className="text-sm">كل لاعب يوقّع نموذج موافقة على معالجة بياناته (العقد والراتب وحالة الجاهزية). رقم النموذج أو اسم ملفه يروح بعمود <bdi dir="ltr" className="num">consent_ref</bdi> لكل لاعب. ما نخزّن النماذج، بس مرجعها.</p>
          <ul className="list-disc space-y-1 ps-5 text-sm text-mute">
            <li>الحالة: جاهز، مشكوك، مصاب، موقوف فقط. <b className="text-ink">ما نقبل ملاحظات صحية ولا تشخيصات.</b></li>
            <li>أقصى 60 لاعب بالملف، وأقصى 200KB.</li>
            <li>أي صف بدون مرجع موافقة يرفض الملف كله.</li>
          </ul>
        </Step>

        <Step n={3} title="استيراد التشكيلة والعقود" state={s3}>
          {dc.agreement ? <ImportPanel demo={demo} onDone={load.reload} /> : <p className="text-sm text-mute">سجّل الاتفاقية بالخطوة 1 أول.</p>}
          {dc.players > 0 && <p className="text-xs text-mute">التشكيلة الحالية: <span className="num">{dc.players}</span> لاعب{dc.real ? ' (بيانات حقيقية)' : ' (تجربة)'}{dc.withdrawals > 0 && <> · موافقات انسحبت: <span className="num">{dc.withdrawals}</span></>}</p>}
        </Step>
      </ol>

      {dc.agreement && dc.players > 0 && <Withdraw userId={user!.id} onDone={load.reload} />}
      {demo && <DemoNote text="* تجربة داخل متصفحك فقط: ما ينرفع شي لأي سيرفر، ويتمسح مع «احذف بياناتي». الأندية خيالية." />}
    </section>
  )
}
