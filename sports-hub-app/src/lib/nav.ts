import type { IconName } from '../components/Icon'
import type { Role } from './roles'

export type NavItem = { to: string; label: string; icon: IconName }

const FAN: NavItem[] = [
  { to: '/', label: 'الرئيسية', icon: 'home' },
  { to: '/standings', label: 'الترتيب', icon: 'table' },
  { to: '/vote', label: 'رجل المباراة', icon: 'vote' },
  { to: '/pass', label: 'تذكرتي', icon: 'pass' },
]
const ZONE: NavItem = { to: '/zone', label: 'الجمهور', icon: 'home' }
const STANDINGS: NavItem = { to: '/standings', label: 'الترتيب', icon: 'table' }
const LOADS: NavItem = { to: '/medical', label: 'الأحمال', icon: 'pulse' }

/* The workspace comes first for staff; the fan screens shrink to one tab. At most five fit the phone tab bar. */
export function navFor(role: Role): NavItem[] {
  switch (role) {
    case 'club_admin': return [{ to: '/club', label: 'غرفة النادي', icon: 'club' }, LOADS, STANDINGS, ZONE]
    case 'bfa_admin': return [{ to: '/federation', label: 'غرفة الاتحاد', icon: 'hub' }, STANDINGS, ZONE]
    case 'medical': return [LOADS, ...FAN]
    default: return FAN
  }
}
