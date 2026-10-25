import { useEffect, useRef, useState } from 'react'
import { bundledLogo, BH_CLUBS } from '../data/bhclubs'
import { DEFAULT_PREFS, readLogos, readPrefs, saveLogo, shrinkLogo, writePrefs, type CardPrefs, type Logos } from '../data/matchcard'
import type { Lineup, LPlayer } from '../lib/lineup'
import { CARD_H, CARD_W, cardCaption, cardDate, cardFileName, cardRows, fitLogo, inkOn, oppKey, rowHeight, splitColumns, validColor } from '../lib/matchcard'
import { Segmented } from './Segmented'

const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'
const ghost = 'min-h-11 rounded-xl border border-white/15 px-4 text-sm'
const btn = 'min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink disabled:opacity-60'
const FONT = '"Lalezar","Tajawal",system-ui,sans-serif'
const BODY = '"Tajawal",system-ui,sans-serif'

const THEMES = {
  dark: { bg0: '#0b1220', bg1: '#111c33', panel: 'rgba(255,255,255,0.07)', ink: '#ffffff', mute: 'rgba(255,255,255,0.65)', line: 'rgba(255,255,255,0.16)' },
  light: { bg0: '#f4f7fb', bg1: '#e3eaf4', panel: 'rgba(11,18,32,0.06)', ink: '#0b1220', mute: 'rgba(11,18,32,0.62)', line: 'rgba(11,18,32,0.16)' },
}

const loadImg = (src: string | null) => new Promise<HTMLImageElement | null>((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src })

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r) }
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, o: { font?: string; align?: CanvasTextAlign; max?: number } = {}) {
  c.font = `${size}px ${o.font ?? BODY}`; c.fillStyle = color; c.textAlign = o.align ?? 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'
  c.fillText(s, x, y, o.max)
}
function logo(c: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, box: number, fallback: string, color: string, ink: string) {
  if (img) { const f = fitLogo(img.width, img.height, box); c.drawImage(img, cx - f.w / 2, cy - f.h / 2, f.w, f.h); return }
  c.fillStyle = color; c.beginPath(); c.arc(cx, cy, box / 2, 0, Math.PI * 2); c.fill()
  text(c, fallback.trim().slice(0, 1) || '؟', cx, cy + 4, box * 0.5, ink, { font: FONT })
}

export type CardInput = { lineup: Lineup; players: LPlayer[]; opponent: string; matchOn: string; captainId: string | null; prefs: CardPrefs; logos: Logos }

export async function drawCard(canvas: HTMLCanvasElement, d: CardInput) {
  try { await Promise.all([document.fonts.load(`40px Lalezar`, 'ابتث0123'), document.fonts.load(`28px Tajawal`, 'ابتث0123')]) } catch { /* system font */ }
  const t = THEMES[d.prefs.theme]; const col = validColor(d.prefs.color) ? d.prefs.color : DEFAULT_PREFS.color; const onCol = inkOn(col)
  const own = await loadImg(d.logos.own ?? bundledLogo(d.prefs.club)); const opp = await loadImg(d.logos.opp[oppKey(d.opponent)] ?? bundledLogo(d.opponent))
  canvas.width = CARD_W; canvas.height = CARD_H
  const c = canvas.getContext('2d')!
  const g = c.createLinearGradient(0, 0, 0, CARD_H); g.addColorStop(0, t.bg1); g.addColorStop(1, t.bg0); c.fillStyle = g; c.fillRect(0, 0, CARD_W, CARD_H)
  // grass stripes + centre circle, drawn in the club colour
  c.save(); c.globalAlpha = 0.07; c.fillStyle = col
  for (let i = 0; i < 12; i++) if (i % 2 === 0) c.fillRect(0, 700 + i * 100, CARD_W, 100)
  c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(CARD_W / 2, 1500, 260, 0, Math.PI * 2); c.stroke(); c.restore()

  const club = d.prefs.club.trim() || 'فريقنا'
  // header
  logo(c, own, CARD_W / 2, 150, 150, club, col, onCol)
  text(c, 'بطاقة المباراة', CARD_W / 2, 270, 78, t.ink, { font: FONT })
  // VS band
  rr(c, 60, 330, CARD_W - 120, 214, 36); c.fillStyle = col; c.fill()
  logo(c, own, 190, 420, 120, club, 'rgba(255,255,255,0.25)', onCol)
  logo(c, opp, CARD_W - 190, 420, 120, d.opponent, 'rgba(255,255,255,0.25)', onCol)
  text(c, 'VS', CARD_W / 2, 430, 74, onCol, { font: FONT })
  text(c, club, 190, 520, 28, onCol, { max: 220 }); text(c, d.opponent.trim() || 'الخصم', CARD_W - 190, 520, 28, onCol, { max: 220 })
  // info row
  const info: [string, string][] = [['التاريخ', cardDate(d.matchOn)], ['البطولة', d.prefs.league.trim() || '—'], ['الملعب', d.prefs.venue.trim() || '—'], ['التجمّع', d.prefs.gather.trim() || '—']]
  const iw = (CARD_W - 120 - 3 * 16) / 4
  info.forEach(([k, v], i) => {
    const x = CARD_W - 60 - (i + 1) * iw - i * 16
    rr(c, x, 572, iw, 120, 22); c.fillStyle = t.panel; c.fill()
    text(c, k, x + iw / 2, 606, 24, col); text(c, v, x + iw / 2, 652, 27, t.ink, { max: iw - 20 })
  })
  // kit
  rr(c, 60, 714, CARD_W - 120, 96, 22); c.fillStyle = t.panel; c.fill()
  text(c, 'الزي المطلوب', CARD_W - 90, 762, 30, col, { align: 'right' })
  text(c, d.prefs.kit.trim() || '—', CARD_W / 2 - 100, 762, 27, t.ink, { max: 600 })
  // players
  const rows = cardRows(d.lineup, d.players, d.captainId)
  const top = 836, bottom = d.prefs.footer ? 1810 : 1860
  const h = rowHeight(rows.length, bottom - top - 40)
  const panelH = Math.min(bottom - top, Math.ceil(rows.length / 2) * h + 40)
  rr(c, 60, top, CARD_W - 120, panelH, 28); c.fillStyle = t.panel; c.fill()
  const [right, left] = splitColumns(rows)
  const colW = (CARD_W - 120 - 60) / 2
  ;[right, left].forEach((list, ci) => {
    const x0 = ci === 0 ? CARD_W - 90 : 90 + colW
    list.forEach((r, i) => {
      const y = top + 20 + i * h + h / 2
      const bx = x0 - 34, bh = Math.min(h - 12, 84), fs = Math.min(40, h * 0.42)
      rr(c, bx - 34, y - bh / 2, 68, bh, 14); c.fillStyle = r.bench ? t.line : col; c.fill()
      text(c, r.num == null ? '—' : String(r.num), bx, y + 3, Math.min(44, bh * 0.58), r.bench ? t.ink : onCol, { font: FONT })
      text(c, r.name, bx - 50, y + 2, fs, t.ink, { align: 'right', max: colW - 210 })
      if (r.tag) { c.font = `${fs}px ${BODY}`; const nameW = Math.min(c.measureText(r.name).width, colW - 210); const tx = Math.max(x0 - colW + 40, bx - 50 - nameW - 46); rr(c, tx - 30, y - 17, 60, 34, 17); c.fillStyle = r.tag === 'C' ? '#f5b301' : t.line; c.fill(); text(c, r.tag, tx, y + 1, 22, r.tag === 'C' ? '#0b1220' : t.ink, { font: FONT }) }
    })
  })
  if (d.prefs.footer) text(c, 'Sports Hub · نسخة تجريبية', CARD_W / 2, 1865, 24, t.mute)
}

export function MatchCard({ lineup, players, opponent, matchOn }: { lineup: Lineup; players: LPlayer[]; opponent: string; matchOn: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [prefs, setPrefs] = useState<CardPrefs>(readPrefs)
  const [logos, setLogos] = useState<Logos>(readLogos)
  const [captainId, setCaptainId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [ownership, setOwnership] = useState(false)
  const rows = cardRows(lineup, players, captainId)
  const onField = [...Object.values(lineup.starters), ...lineup.bench].map((id) => players.find((p) => p.id === id)).filter((p): p is LPlayer => !!p)
  const key = JSON.stringify([lineup, opponent, matchOn, captainId, prefs, logos, players.length])
  const set = (p: Partial<CardPrefs>) => { const n = { ...prefs, ...p }; setPrefs(n); writePrefs(n) }

  useEffect(() => { if (ref.current && rows.length) void drawCard(ref.current, { lineup, players, opponent, matchOn, captainId, prefs, logos }) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(which: 'own' | 'opp', f?: File) {
    if (!f) return
    if (!ownership) return setMsg({ ok: false, text: 'أكّد أولاً أن الشعار حقّك أو معك إذن باستخدامه.' })
    try { setLogos(saveLogo(which === 'own' ? 'own' : { opponent }, await shrinkLogo(f))); setMsg({ ok: true, text: 'انحفظ الشعار على هذا الجهاز فقط.' }) } catch (e) { setMsg({ ok: false, text: e instanceof Error && e.message === 'size' ? 'الصورة كبيرة (أقل من 8 ميغا).' : 'ما قدرنا نقرأ الصورة. استخدم PNG أو JPG.' }) }
  }
  const caption = () => cardCaption({ club: prefs.club, opponent, matchOn, league: prefs.league, venue: prefs.venue, gather: prefs.gather, kit: prefs.kit })
  async function copyCaption() { try { await navigator.clipboard.writeText(caption()); setMsg({ ok: true, text: 'اننسخ النص. الصقه مع الصورة بالقروب.' }) } catch { setMsg({ ok: false, text: 'ما قدرنا ننسخ. جرّب من متصفح ثاني.' }) } }
  const blob = () => new Promise<Blob | null>((r) => ref.current!.toBlob(r, 'image/png'))
  async function download() {
    const b = await blob(); if (!b) return setMsg({ ok: false, text: 'ما انرسمت البطاقة.' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = cardFileName(matchOn); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  async function share() {
    const b = await blob(); if (!b) return
    const file = new File([b], cardFileName(matchOn), { type: 'image/png' })
    try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'بطاقة المباراة', text: caption() }); else await download() } catch { /* cancelled */ }
  }

  return (
    <article className="glass rise space-y-4 p-4 md:p-5" aria-label="بطاقة المباراة">
      <h2 className="font-display text-2xl">بطاقة المباراة</h2>
      <datalist id="bhClubs">{BH_CLUBS.map((c) => <option key={c.slug} value={c.ar} />)}</datalist>
      <p className="text-xs text-mute">صورة جاهزة لقروب اللاعبين: الشعار، الخصم، التاريخ، الزي، والقائمة بأرقامها. تنرسم على جهازك ولا ينرسل منها شي.</p>
      {rows.length === 0 ? <p className="text-sm text-mute" role="status">اختر لاعبين أولاً (أو اقترح التشكيلة) وتطلع البطاقة هنا.</p> : (
        <>
          <canvas ref={ref} role="img" aria-label="معاينة بطاقة المباراة" className="mx-auto block w-full max-w-xs rounded-2xl border border-white/10" style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1"><span className="text-xs text-mute">اسم ناديك</span><input id="cardClub" list="bhClubs" maxLength={30} value={prefs.club} onChange={(e) => set({ club: e.target.value })} className={field} /></label>
            <label className="block space-y-1"><span className="text-xs text-mute">البطولة والجولة</span><input id="cardLeague" maxLength={30} value={prefs.league} onChange={(e) => set({ league: e.target.value })} className={field} placeholder="مثال: الدوري · الجولة 3" /></label>
            <label className="block space-y-1"><span className="text-xs text-mute">الملعب</span><input id="cardVenue" maxLength={30} value={prefs.venue} onChange={(e) => set({ venue: e.target.value })} className={field} /></label>
            <label className="block space-y-1"><span className="text-xs text-mute">وقت التجمّع</span><input id="cardGather" maxLength={30} value={prefs.gather} onChange={(e) => set({ gather: e.target.value })} className={field} placeholder="مثال: 5:30 م" /></label>
            <label className="block space-y-1 sm:col-span-2"><span className="text-xs text-mute">الزي المطلوب</span><input id="cardKit" maxLength={80} value={prefs.kit} onChange={(e) => set({ kit: e.target.value })} className={field} /></label>
            <label className="block space-y-1"><span className="text-xs text-mute">الكابتن</span>
              <select id="cardCaptain" value={captainId ?? ''} onChange={(e) => setCaptainId(e.target.value || null)} className={field}><option value="">بدون</option>{onField.map((p) => <option key={p.id} value={p.id}>{p.num ?? '—'} · {p.name}</option>)}</select></label>
            <label className="block space-y-1"><span className="text-xs text-mute">لون النادي</span><input id="cardColor" type="color" value={validColor(prefs.color) ? prefs.color : DEFAULT_PREFS.color} onChange={(e) => set({ color: e.target.value })} className="h-11 w-full rounded-xl border border-white/15 bg-white/5 p-1" /></label>
          </div>
          <Segmented label="القالب" value={prefs.theme} onChange={(v) => set({ theme: v })} options={[{ key: 'dark', label: 'داكن' }, { key: 'light', label: 'فاتح' }]} />
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={prefs.footer} onChange={(e) => set({ footer: e.target.checked })} className="size-5" /> اذكر «Sports Hub» أسفل البطاقة</label>

          <fieldset className="space-y-2 rounded-xl border border-white/10 p-3">
            <legend className="px-1 text-sm font-bold">الشعارات</legend>
            <label className="flex min-h-11 items-start gap-2 text-xs text-mute"><input type="checkbox" checked={ownership} onChange={(e) => setOwnership(e.target.checked)} className="mt-0.5 size-5 shrink-0" /> أقرّ أن الشعار حقّ ناديي أو معي إذن باستخدامه. التطبيق ما يوزّع شعارات أندية؛ الشعار ينحفظ على هذا الجهاز فقط.</label>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${ghost} inline-flex cursor-pointer items-center`}>شعار ناديي<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="ارفع شعار ناديك" onChange={(e) => { void pick('own', e.target.files?.[0]); e.target.value = '' }} /></label>
              {logos.own && <button type="button" className={ghost} onClick={() => setLogos(saveLogo('own', null))}>أزل شعاري</button>}
              <label className={`${ghost} inline-flex cursor-pointer items-center`}>شعار الخصم<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="ارفع شعار الخصم" onChange={(e) => { void pick('opp', e.target.files?.[0]); e.target.value = '' }} /></label>
              {logos.opp[oppKey(opponent)] && <button type="button" className={ghost} onClick={() => setLogos(saveLogo({ opponent }, null))}>أزل شعار الخصم</button>}
            </div>
            <p className="text-xs text-mute">شعار الخصم ينحفظ باسمه، فإذا لعبتوا ضده مرة ثانية يطلع تلقائي.</p>
          </fieldset>

          <details className="text-sm"><summary className="min-h-11 cursor-pointer py-2 text-mute">النص المرفق مع الصورة</summary><pre className="whitespace-pre-wrap rounded-xl bg-white/5 p-3 text-xs" dir="rtl">{caption()}</pre></details>
          <p className="text-xs text-mute">بتنرسل أسماء اللاعبين بالصورة: تأكد إن قروبكم للمعنيين فقط. ما فيها بيانات صحية ولا رواتب.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={download} className={btn}>نزّل البطاقة (PNG)</button>
            <button type="button" onClick={share} className={ghost}>شارك مع النص</button>
            <button type="button" onClick={copyCaption} className={ghost}>انسخ النص</button>
          </div>
          {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-safe' : 'text-crimson-ink'}`}>{msg.text}</p>}
        </>
      )}
    </article>
  )
}
