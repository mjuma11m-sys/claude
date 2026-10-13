import { Navigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { homePath } from '../lib/roles'
import { Home } from './Home'

/* "/" is the fan home for fans, and the sign-in landing for staff: clubs and the federation go straight to their room. */
export function Landing() {
  const { user } = useAuth()
  const to = user ? homePath(user.role) : '/'
  return to === '/' ? <Home /> : <Navigate to={to} replace />
}
