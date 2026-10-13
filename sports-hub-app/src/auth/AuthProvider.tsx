import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { isRole, type Role } from '../lib/roles'

export type User = { id: string; email?: string; role: Role }
type AuthState = {
  user: User | null
  loading: boolean
  demo: boolean
  signInDemo: (role: Role) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const DEMO_KEY = 'sh.demoRole'

function readDemoRole(): Role | null {
  try {
    const v = localStorage.getItem(DEMO_KEY)
    return isRole(v) ? v : null
  } catch {
    return null
  }
}

/* Role comes from public.profiles (RLS: a user reads only their own row). Anything unexpected = fan. */
async function loadRole(id: string): Promise<Role> {
  const { data } = await supabase!.from('profiles').select('role').eq('id', id).maybeSingle()
  return isRole(data?.role) ? data.role : 'fan'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demo = supabase === null
  const [user, setUser] = useState<User | null>(() => {
    const role = demo ? readDemoRole() : null
    return role ? { id: 'demo', role } : null
  })
  const [loading, setLoading] = useState(!demo)

  useEffect(() => {
    if (!supabase) return
    const apply = async (s: { user: { id: string; email?: string } } | null) => {
      setUser(s ? { id: s.user.id, email: s.user.email, role: await loadRole(s.user.id) } : null)
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { void apply(s) })
    return () => data.subscription.unsubscribe()
  }, [])

  const signInDemo = (role: Role) => {
    try { localStorage.setItem(DEMO_KEY, role) } catch { /* private mode: session-only */ }
    setUser({ id: 'demo', role })
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    try { localStorage.removeItem(DEMO_KEY) } catch { /* ignore */ }
    setUser(null)
  }

  return <AuthContext value={{ user, loading, demo, signInDemo, signOut }}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
