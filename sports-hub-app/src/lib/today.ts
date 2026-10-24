/* "Today": what needs a decision, computed from the same data the room shows, so the strip can never disagree with the screen.
   Most urgent first; at most five, so it stays a glance and not a second dashboard. */
import { daysLeft } from './contracts'
import { ffpStatus, type FfpStatus } from './ffp'
import type { PlayerStatus } from './squad'

export type Tone = 'urgent' | 'warn' | 'info'
export type TodayItem = { key: string; tone: Tone; text: string; to?: string; act?: string }
const RANK: Record<Tone, number> = { urgent: 0, warn: 1, info: 2 }
const finish = (items: TodayItem[]) => items.sort((a, b) => RANK[a.tone] - RANK[b.tone]).slice(0, 5)

export function clubToday(i: {
  squad: { status: PlayerStatus; endsOn: string }[]
  ratio: number | null
  limit: number
  imported: boolean
  repeatAbsent?: number
  lateRequests?: number
  lateWages?: number
  today?: Date
}): TodayItem[] {
  const out: TodayItem[] = []
  const now = i.today ?? new Date()
  const status: FfpStatus = ffpStatus(i.ratio, i.limit)
  if (status === 'missing') out.push({ key: 'report', tone: 'warn', text: 'ما رفعت تقرير الموسم للاتحاد', to: '#report' })
  if (status === 'over') out.push({ key: 'over', tone: 'urgent', text: 'نسبة الأجور فوق الحد', to: '#report' })
  if (status === 'near') out.push({ key: 'near', tone: 'warn', text: 'نسبة الأجور قريبة من الحد', to: '#report' })
  const ended = i.squad.filter((p) => daysLeft(p.endsOn, now) < 0).length
  const soon = i.squad.filter((p) => { const d = daysLeft(p.endsOn, now); return d >= 0 && d <= 183 }).length
  if (ended) out.push({ key: 'ended', tone: 'urgent', text: `عقود منتهية وما انجددت: ${ended}`, to: '#contracts' })
  if (soon) out.push({ key: 'soon', tone: 'warn', text: `عقود تنتهي خلال 6 أشهر: ${soon}`, to: '#contracts' })
  if (!i.imported) out.push({ key: 'data', tone: 'info', text: 'البيانات تجريبية. ابدأ باستيراد بيانات ناديك', to: '/data' }) // before the softer health items: it is the way to real data
  const out_ = i.squad.filter((p) => p.status === 'injured' || p.status === 'suspended').length
  if (out_) out.push({ key: 'out', tone: 'info', text: `لاعبون غير متاحين (إصابة أو إيقاف): ${out_}`, to: '#squad' })
  const maybe = i.squad.filter((p) => p.status === 'doubtful').length
  if (maybe) out.push({ key: 'maybe', tone: 'info', text: `لاعبون مشكوك بجاهزيتهم: ${maybe}`, to: '#squad' })
  if (i.lateRequests) out.push({ key: 'requests', tone: 'urgent', text: `طلبات لاعبين تعدّت مهلتها الداخلية: ${i.lateRequests}`, to: '/rights' })
  if (i.lateWages) out.push({ key: 'wages', tone: 'urgent', text: `رواتب متأخرة حسب سجلك: ${i.lateWages}`, to: '/rights' })
  if (i.repeatAbsent) out.push({ key: 'absent', tone: 'warn', text: `غياب متكرر (3 بلا عذر متتالية): ${i.repeatAbsent}`, to: '/attendance' })
  return finish(out)
}

export function federationToday(rows: { status: FfpStatus }[]): TodayItem[] {
  const n = (s: FfpStatus) => rows.filter((r) => r.status === s).length
  const out: TodayItem[] = []
  if (n('over')) out.push({ key: 'over', tone: 'urgent', text: `أندية تجاوزت حد الأجور: ${n('over')}`, act: 'over' })
  if (n('near')) out.push({ key: 'near', tone: 'warn', text: `أندية قريبة من حد الأجور: ${n('near')}`, act: 'near' })
  if (n('missing')) out.push({ key: 'missing', tone: 'warn', text: `أندية ما رفعت تقرير الموسم: ${n('missing')}`, act: 'missing' })
  return finish(out)
}
