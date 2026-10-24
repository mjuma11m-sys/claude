import { describe, expect, it } from 'vitest'
import { onboarding } from './onboarding'

describe('onboarding', () => {
  it('starts with nothing done and points at the agreement', () => {
    const p = onboarding({ agreement: false, imported: false, attendanceSessions: 0, reports: 0 })
    expect([p.done, p.total, p.complete, p.next?.key]).toEqual([0, 4, false, 'agreement'])
  })
  it('points at the first step that is not done, in order', () => {
    expect(onboarding({ agreement: true, imported: false, attendanceSessions: 3, reports: 1 }).next?.key).toBe('import')
    expect(onboarding({ agreement: true, imported: true, attendanceSessions: 0, reports: 0 }).next?.key).toBe('attendance')
  })
  it('is complete only when all four exist, and has no next step then', () => {
    const p = onboarding({ agreement: true, imported: true, attendanceSessions: 1, reports: 1 })
    expect([p.done, p.complete, p.next]).toEqual([4, true, null])
  })
})
