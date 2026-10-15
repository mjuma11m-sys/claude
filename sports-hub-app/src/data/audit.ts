/* The club's internal operations log (migration 0013): who changed which table, when, how many rows. No content is stored.
   It exists only with a real database; the browser sandbox writes nothing, so it says so instead of inventing lines. */
import { supabase } from '../lib/supabase'

export type AuditRow = { id: number; at: string; op: 'insert' | 'update' | 'delete' | 'export'; entity: string; n: number; by: 'me' | 'other' | 'system' }
export type Audit = { enabled: boolean; rows: AuditRow[] }

export async function getAudit(userId: string): Promise<Audit> {
  if (!supabase) return { enabled: false, rows: [] }
  const { data, error } = await supabase.from('audit_log').select('id, at, actor, op, entity, n').order('id', { ascending: false }).limit(50)
    .returns<{ id: number; at: string; actor: string | null; op: AuditRow['op']; entity: string; n: number }[]>()
  if (error) throw error
  return { enabled: true, rows: data.map((r) => ({ id: r.id, at: r.at, op: r.op, entity: r.entity, n: r.n, by: r.actor === null ? 'system' : r.actor === userId ? 'me' : 'other' })) }
}

export const OP_TEXT: Record<AuditRow['op'], string> = { insert: 'إضافة', update: 'تعديل', delete: 'حذف', export: 'تصدير' }
export const ENTITY_TEXT: Record<string, string> = {
  players: 'لاعبون', contracts: 'عقود', player_status: 'حالات اللاعبين', data_agreements: 'اتفاقية المعالجة', attendance_sessions: 'جلسات حضور', lineups: 'تشكيلات',
  match_reports: 'تقارير مباريات', player_requests: 'طلبات اللاعبين', wage_payments: 'سجل الرواتب', skill_assessments: 'تقييمات', dev_goals: 'أهداف تطوير', training_logs: 'سجل التمرين', club_finance_reports: 'التقرير المالي',
}
export const BY_TEXT: Record<AuditRow['by'], string> = { me: 'أنت', other: 'مستخدم آخر', system: 'النظام' }
