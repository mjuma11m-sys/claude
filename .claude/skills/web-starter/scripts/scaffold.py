"""Scaffold an Arabic-first (RTL) React app: Vite + TypeScript + Tailwind v4 + Supabase auth + typed API client.

  python scaffold.py <target_dir> [--title "اسم التطبيق"]
Existing files are never overwritten. Pairs with flask-api/scripts/scaffold.py (same error shape).
"""
import json
import sys
from pathlib import Path

PACKAGE = {
    "name": "web",
    "private": True,
    "version": "0.1.0",
    "type": "module",
    "engines": {"node": ">=20"},
    "scripts": {
        "dev": "vite",
        "build": "tsc -b && vite build",
        "preview": "vite preview",
        "typecheck": "tsc -b",
        "test": "vitest run",
    },
    "dependencies": {
        "@supabase/supabase-js": "2.117.3",
        "react": "19.3.0",
        "react-dom": "19.3.0",
        "react-router": "7.18.4",
    },
    "devDependencies": {
        "@tailwindcss/vite": "4.3.3",
        "@types/react": "19.3.0",
        "@types/react-dom": "19.3.0",
        "@vitejs/plugin-react": "6.1.2",
        "tailwindcss": "4.3.3",
        "typescript": "5.9.3",
        "vite": "8.3.4",
        "vitest": "5.0.5",
    },
}

FILES = {
"index.html": '''<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap" rel="stylesheet" />
    <title>{title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
''',
"vite.config.ts": '''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
''',
"tsconfig.json": '''{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
''',
"vercel.json": '''{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
''',
".env.example": '''VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:5000
''',
".gitignore": "node_modules/\ndist/\n.env\n.env.local\n",
"src/index.css": '''@import "tailwindcss";

@theme {
  --font-sans: "IBM Plex Sans Arabic", ui-sans-serif, system-ui, sans-serif;
  --color-brand-50: oklch(0.97 0.02 250);
  --color-brand-500: oklch(0.55 0.17 255);
  --color-brand-600: oklch(0.48 0.17 258);
  --color-brand-700: oklch(0.41 0.15 260);
}

@layer base {
  html { -webkit-tap-highlight-color: transparent; text-size-adjust: 100%; }
  body { @apply bg-slate-50 font-sans text-[15px] leading-relaxed text-slate-900 antialiased; }
  input, select, textarea { font-size: 16px; } /* no iOS zoom on focus */
  :focus-visible { @apply outline-2 outline-offset-2 outline-brand-500; }
}
''',
"src/main.tsx": '''import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
''',
"src/router.tsx": '''import { createBrowserRouter } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [{ index: true, element: <Dashboard /> }],
  },
  { path: '*', element: <NotFound /> },
])
''',
"src/lib/supabase.ts": '''import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set (see .env.example)')
}

export const supabase = createClient(url, anonKey)
''',
"src/lib/api.ts": '''import { supabase } from './supabase'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\\/$/, '')

/** Matches the Flask error shape: { error: { code, message, fields? } } */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: unknown) {
    super(message)
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const err = body?.error ?? {}
    throw new ApiError(res.status, err.code ?? 'network', err.message ?? 'تعذّر الاتصال بالخادم', err.fields)
  }
  return body as T
}

export const get = <T,>(path: string) => api<T>(path)
export const post = <T,>(path: string, data: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(data) })
export const patch = <T,>(path: string, data: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(data) })
export const del = (path: string) => api<void>(path, { method: 'DELETE' })
''',
"src/lib/format.ts": '''const LOCALE = 'ar-BH-u-nu-latn'
const TZ = 'Asia/Bahrain'

const number = new Intl.NumberFormat(LOCALE)
const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BHD', minimumFractionDigits: 3 })
const date = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: TZ })
const dateTime = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ })
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 })

export const fmtNumber = (n: number) => number.format(n)
export const fmtMoney = (n: number | string) => money.format(Number(n))
export const fmtDate = (d: string | Date) => date.format(new Date(d))
export const fmtDateTime = (d: string | Date) => dateTime.format(new Date(d))
export const fmtPercent = (ratio: number) => percent.format(ratio)
''',
"src/lib/format.test.ts": '''import { describe, expect, it } from 'vitest'
import { fmtMoney, fmtNumber, fmtPercent } from './format'

describe('format', () => {
  it('uses latin digits', () => expect(fmtNumber(1234)).toMatch(/1.?234/))
  it('shows BHD with 3 decimals', () => expect(fmtMoney(12.5)).toContain('12.500'))
  it('formats percent', () => expect(fmtPercent(0.756)).toContain('76'))
})
''',
"src/auth/AuthProvider.tsx": '''import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = { session: Session | null; loading: boolean; signOut: () => Promise<void> }

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return <AuthContext value={{ session, loading, signOut }}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
''',
"src/auth/RequireAuth.tsx": '''import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'
import { Spinner } from '../components/Spinner'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
''',
"src/components/Spinner.tsx": '''export function Spinner() {
  return (
    <span
      role="status"
      aria-label="جارٍ التحميل"
      className="inline-block size-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 motion-reduce:animate-none"
    />
  )
}
''',
"src/components/Layout.tsx": '''import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthProvider'

const NAV = [{ to: '/', label: 'الرئيسية' }]

export function Layout() {
  const { session, signOut } = useAuth()
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-e border-slate-200 bg-white p-4 md:block">
        <p className="mb-6 text-lg font-bold">{document.title}</p>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 transition-colors ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <bdi className="truncate text-sm text-slate-500" dir="ltr">{session?.user.email}</bdi>
          <button onClick={signOut} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            تسجيل الخروج
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
''',
"src/pages/Login.tsx": '''import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

export function Login() {
  const { session } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('البريد أو كلمة المرور غير صحيحة')
    setBusy(false)
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-bold">تسجيل الدخول</h1>
        <label className="block space-y-1">
          <span className="text-sm text-slate-600">البريد الإلكتروني</span>
          <input
            type="email" dir="ltr" inputMode="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-start"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-600">كلمة المرور</span>
          <input
            type="password" dir="ltr" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-start"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? 'جارٍ الدخول…' : 'دخول'}
        </button>
      </form>
    </main>
  )
}
''',
"src/pages/Dashboard.tsx": '''import { fmtDate, fmtMoney, fmtNumber } from '../lib/format'

const STATS = [
  { label: 'العدد', value: fmtNumber(0) },
  { label: 'المبلغ', value: fmtMoney(0) },
  { label: 'التاريخ', value: fmtDate(new Date()) },
]

export function Dashboard() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">الرئيسية</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
''',
"src/pages/NotFound.tsx": '''import { Link } from 'react-router'

export function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-4 text-center">
      <div className="space-y-3">
        <p className="text-5xl font-bold text-slate-300">404</p>
        <p>الصفحة غير موجودة</p>
        <Link to="/" className="text-brand-600 underline">رجوع للرئيسية</Link>
      </div>
    </main>
  )
}
''',
}


def write(path: Path, content: str):
    if path.exists():
        print(f"skip  {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"write {path}")


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    root = Path(argv[0])
    title = argv[argv.index("--title") + 1] if "--title" in argv else "التطبيق"
    write(root / "package.json", json.dumps(PACKAGE, indent=2, ensure_ascii=False) + "\n")
    for rel, content in FILES.items():
        write(root / rel, content.replace("{title}", title))
    print(f"\nnext: cd {root} && cp .env.example .env && npm install && npm run dev")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
