/* "Start here": the four things a new club does first, each done when its data exists. Pure, so the card can never disagree with the screens. */
export type Step = { key: 'agreement' | 'import' | 'attendance' | 'report'; label: string; to: string; done: boolean }
export type Progress = { steps: Step[]; done: number; total: number; complete: boolean; next: Step | null }

export function onboarding(i: { agreement: boolean; imported: boolean; attendanceSessions: number; reports: number }): Progress {
  const steps: Step[] = [
    { key: 'agreement', label: 'سجّل اتفاقية معالجة البيانات', to: '/data', done: i.agreement },
    { key: 'import', label: 'استورد التشكيلة والعقود', to: '/data', done: i.imported },
    { key: 'attendance', label: 'سجّل أول حضور', to: '/attendance', done: i.attendanceSessions > 0 },
    { key: 'report', label: 'أدخل أول تقرير مباراة', to: '/analysis', done: i.reports > 0 },
  ]
  const done = steps.filter((s) => s.done).length
  return { steps, done, total: steps.length, complete: done === steps.length, next: steps.find((s) => !s.done) ?? null }
}
