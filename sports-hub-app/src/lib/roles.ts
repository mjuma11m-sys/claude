export const ROLES = ['fan', 'player', 'medical', 'club_admin', 'bfa_admin'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  fan: 'مشجع',
  player: 'لاعب',
  medical: 'الطاقم الطبي',
  club_admin: 'إدارة النادي',
  bfa_admin: 'الاتحاد',
}

/* Roles that have a screen of their own today. club_admin and bfa_admin exist in the database for the next
   phase but have no room yet, so the demo login does not offer them. */
export const DEMO_ROLES: readonly Role[] = ['fan', 'medical']

export type Area = 'fan' | 'medical'

/* UI gate only. The real firewall is RLS in supabase/migrations: a hidden link is not security. */
const ACCESS: Record<Area, readonly Role[]> = {
  fan: ROLES,
  medical: ['medical', 'club_admin'],
}

export const canAccess = (role: Role, area: Area) => ACCESS[area].includes(role)

export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLES as readonly string[]).includes(v)
