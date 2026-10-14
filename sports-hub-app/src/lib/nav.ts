import type { IconName } from '../components/Icon'
import { FAN_ZONE } from './features'
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
const DATA: NavItem = { to: '/data', label: 'البيانات', icon: 'data' }
const LINEUP: NavItem = { to: '/lineup', label: 'التشكيلة', icon: 'pitch' }
const ATT: NavItem = { to: '/attendance', label: 'الحضور', icon: 'check' }
const DEV: NavItem = { to: '/development', label: 'التطوير', icon: 'bolt' }
const LOADS: NavItem = { to: '/medical', label: 'الأحمال', icon: 'pulse' }

/* The workspace comes first for staff; the fan screens shrink to one tab. At most five fit the phone tab bar. */
export function navFor(role: Role, fanZone = FAN_ZONE): NavItem[] {
  const zone = fanZone ? [ZONE] : []
  switch (role) {
    case 'club_admin': return [{ to: '/club', label: 'غرفة النادي', icon: 'club' }, LINEUP, ATT, DEV, DATA, STANDINGS, LOADS, ...zone]
    case 'bfa_admin': return [{ to: '/federation', label: 'غرفة الاتحاد', icon: 'hub' }, STANDINGS, ...zone]
    case 'medical': return fanZone ? [LOADS, ATT, DEV, ...FAN] : [LOADS, ATT, DEV, STANDINGS]
    default: return fanZone ? FAN : [STANDINGS]
  }
}
