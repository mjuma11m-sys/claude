import { Navigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { FAN_ZONE } from '../lib/features'
import { homePath } from '../lib/roles'
import { ClubsOnly } from './ClubsOnly'
import { Home } from './Home'

/* "/" is the sign-in landing: clubs and the federation go straight to their room. The fan home shows only while the fan zone is on. */
export function Landing() {
  const { user } = useAuth()
  const to = user ? homePath(user.role) : '/'
  if (to !== '/') return <Navigate to={to} replace />
  return FAN_ZONE ? <Home /> : <ClubsOnly />
}
