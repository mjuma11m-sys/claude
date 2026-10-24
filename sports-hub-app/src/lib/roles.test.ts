import { describe, expect, it } from 'vitest'
import { ROLES, canAccess, isRole } from './roles'

describe('roles', () => {
  it('every role reaches the fan zone', () => ROLES.forEach((r) => expect(canAccess(r, 'fan')).toBe(true)))
  it('fans never reach staff areas', () => {
    expect(canAccess('fan', 'medical')).toBe(false)
    expect(canAccess('bfa_admin', 'medical')).toBe(false)
  })
  it('players do not see medical data of the squad', () => expect(canAccess('player', 'medical')).toBe(false))
  it('club admins can open their medical area', () => expect(canAccess('club_admin', 'medical')).toBe(true))
  it('rejects unknown roles', () => {
    expect(isRole('admin')).toBe(false)
    expect(isRole('medical')).toBe(true)
  })
})
