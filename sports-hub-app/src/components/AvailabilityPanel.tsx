import { useState } from 'react'
import { availOf, setAvailability } from '../data/availability'
import type { DevPlayer } from '../data/development'
import { availabilityLine, FIT, type Availability } from '../lib/availability'
import { fmtDate } from '../lib/format'
import { STATUS } from '../lib/squad'
import { AvailabilityEditor, editorOk } from './AvailabilityEditor'

const btn = 'min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink disabled:opacity-60'
const ghost = 'min-h-11 rounded-xl border border-white/15 px-4 text-sm'

/* One row per player; tapping opens the editor. Names and a short note only: no diagnosis, no treatment. */
export function AvailabilityPanel({ players, onChanged }: { players: DevPlayer[]; onChanged: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Availability>(FIT)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function open(p: DevPlayer) { setOpenId(p.id); setDraft(availOf(p)); setMsg(null) }
  async function save(p: DevPlayer) {
    setBusy(true); setMsg(null)
    try { await setAvailability(p.id, draft); setOpenId(null); setMsg({ ok: true, text: `انحفظت حالة ${p.name}` }); onChanged() }
    catch { setMsg({ ok: false, text: 'ما انحفظت. تأكد من الاتصال، والتعديل للإداري والطاقم الطبي فقط.' }) }
    finally { setBusy(false) }
  }

  return (
    <article className="glass rise space-y-3 p-4 md:p-5" aria-label="حالة اللاعبين">
      <h2 className="font-display text-2xl">حالة اللاعبين</h2>
      <p className="text-xs text-mute">إصابة أو إيقاف أو كروت. تظهر بالتشكيلة (المصاب والموقوف ما ينختارون)، وتقدر تعرض أسماء الغائبين فقط على بطاقة المباراة. نوع الإصابة وموعد العودة داخل النادي ولا تطلع للبطاقة.</p>
      <ul className="divide-y divide-white/10">
        {players.map((p) => {
          const a = availOf(p); const line = availabilityLine(a, fmtDate)
          return (
            <li key={p.id} className="py-1">
              <button type="button" onClick={() => (openId === p.id ? setOpenId(null) : open(p))} aria-expanded={openId === p.id} aria-label={`حالة ${p.name}`} className="flex min-h-11 w-full items-center gap-3 text-start">
                <span className="num font-display text-xl leading-none">{p.num ?? '—'}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">{p.name}</span>{line && <span className="block truncate text-xs text-mute">{line}</span>}</span>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
              </button>
              {openId === p.id && (
                <div className="space-y-3 pb-3 pt-2">
                  <AvailabilityEditor value={draft} onChange={setDraft} idPrefix="avail" />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => save(p)} disabled={busy || !editorOk(draft)} className={btn}>احفظ الحالة</button>
                    <button type="button" onClick={() => setOpenId(null)} className={ghost}>إغلاق</button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-safe' : 'text-crimson-ink'}`}>{msg.text}</p>}
    </article>
  )
}
