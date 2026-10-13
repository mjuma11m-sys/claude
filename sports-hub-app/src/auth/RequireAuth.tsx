import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'
import { Spinner } from '../components/Spinner'
import { canAccess, type Area } from '../lib/roles'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function RequireArea({ area, children }: { area: Area; children: ReactNode }) {
  const { user } = useAuth()
  if (!user || !canAccess(user.role, area)) return <Navigate to="/" replace />
  return children
}
