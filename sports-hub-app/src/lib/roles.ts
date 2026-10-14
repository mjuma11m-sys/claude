import { FAN_ZONE } from './features'

export const ROLES = ['fan', 'player', 'medical', 'club_admin', 'bfa_admin'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  fan: 'مشجع',
  player: 'لاعب',
  medical: 'الطاقم الطبي',
  club_admin: 'إدارة النادي',
  bfa_admin: 'الاتحاد',
}

/* Roles with a screen of their own, in the order the demo login lists them: clubs and the federation come first. */
export const DEMO_ROLES: readonly Role[] = FAN_ZONE ? ['club_admin', 'bfa_admin', 'medical', 'fan'] : ['club_admin', 'bfa_admin', 'medical']

export type Area = 'fan' | 'medical' | 'club' | 'federation' | 'development' | 'lineup'

/* UI gate only. The real firewall is RLS in supabase/migrations: a hidden link is not security. */
const ACCESS: Record<Area, readonly Role[]> = {
  fan: ROLES,
  medical: ['medical', 'club_admin'],
  club: ['club_admin'],
  federation: ['bfa_admin'],
  development: ['club_admin', 'medical'],
  lineup: ['club_admin'],
}

export const canAccess = (role: Role, area: Area) => ACCESS[area].includes(role)

export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLES as readonly string[]).includes(v)

/* Where each role lands after signing in: staff go to their own room, the public zone is a tab for them. */
export const homePath = (role: Role, fanZone = FAN_ZONE) =>
  role === 'club_admin' ? '/club' : role === 'bfa_admin' ? '/federation' : role === 'medical' && !fanZone ? '/medical' : '/'
