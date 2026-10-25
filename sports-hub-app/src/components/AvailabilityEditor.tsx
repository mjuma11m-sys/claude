import { AVAIL_ERROR_TEXT, MAX_RED, MAX_YELLOW, NOTE_MAX, validateAvailability, type Availability } from '../lib/availability'
import { STATUS, type PlayerStatus } from '../lib/squad'
import { Segmented } from './Segmented'

const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'

const OPTIONS = (['fit', 'doubtful', 'injured', 'suspended'] as PlayerStatus[]).map((k) => ({ key: k, label: STATUS[k].label }))
const today = () => new Date().toISOString().slice(0, 10)

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="min-w-24 text-sm">{label}</span>
      <button type="button" aria-label={`أنقص ${label}`} disabled={value <= 0} onClick={() => onChange(value - 1)} className="grid size-11 place-items-center rounded-xl border border-white/15 disabled:opacity-40">−</button>
      <span className="num w-8 text-center text-lg" aria-live="polite">{value}</span>
      <button type="button" aria-label={`زد ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-11 place-items-center rounded-xl border border-white/15 disabled:opacity-40">+</button>
    </div>
  )
}

/* Controlled editor for one player's availability. The parent decides what saving means. */
export function AvailabilityEditor({ value, onChange, idPrefix }: { value: Availability; onChange: (a: Availability) => void; idPrefix: string }) {
  const set = (p: Partial<Availability>) => onChange({ ...value, ...p })
  const hurt = value.status === 'injured' || value.status === 'doubtful'
  const err = validateAvailability(value, today())
  return (
    <div className="space-y-3">
      <Segmented label="الحالة" value={value.status} onChange={(status) => set({ status })} options={OPTIONS} />
      {hurt && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1"><span className="text-xs text-mute">نوع الإصابة (كلمة أو كلمتين، بدون تشخيص طبي)</span><input id={`${idPrefix}Note`} maxLength={NOTE_MAX} value={value.note} onChange={(e) => set({ note: e.target.value })} className={field} placeholder="مثال: كاحل، عضلة" /></label>
          <label className="block space-y-1"><span className="text-xs text-mute">متوقع يرجع</span><input id={`${idPrefix}Return`} type="date" dir="ltr" min={today()} value={value.returnOn ?? ''} onChange={(e) => set({ returnOn: e.target.value || null })} className={field} /></label>
        </div>
      )}
      <Stepper label="كروت صفراء" value={value.yellow} max={MAX_YELLOW} onChange={(yellow) => set({ yellow })} />
      <Stepper label="كروت حمراء" value={value.red} max={MAX_RED} onChange={(red) => set({ red })} />
      {err && <p role="alert" className="text-sm text-crimson-ink">{AVAIL_ERROR_TEXT[err]}</p>}
    </div>
  )
}

export const editorOk = (a: Availability) => validateAvailability(a, today()) === null

