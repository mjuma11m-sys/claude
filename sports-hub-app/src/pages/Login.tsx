import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { Logo, Wordmark } from '../components/Logo'
import { PRIVACY_CONTACT } from '../lib/legal'
import { supabase } from '../lib/supabase'
import { DEMO_ROLES, ROLE_LABEL } from '../lib/roles'

export function Login() {
  const { user, demo, signInDemo } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (error) setError('ما قدرنا نرسل الرابط، جرّب مرة ثانية')
    else setSent(true)
    setBusy(false)
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="glass w-full max-w-sm space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Logo className="size-10" />
          <div>
            <h1 className="text-xl"><Wordmark /></h1>
            <p className="text-sm text-mute">منصة كرة القدم البحرينية</p>
          </div>
        </div>

        {demo ? (
          <div className="space-y-3">
            <p className="text-sm text-mute">وضع تجريبي: اختر الدور عشان تشوف الواجهة اللي تطلع له. باقي الأدوار (إدارة النادي، الاتحاد) ما لها شاشات للحين.</p>
            <div className="grid gap-2">
              {DEMO_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => signInDemo(r)}
                  className="rounded-xl border border-white/10 px-4 py-3 text-start transition-colors hover:border-pulse/50 hover:bg-pulse/5 active:scale-[0.99]"
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
        ) : !PRIVACY_CONTACT ? (
          <p role="status" className="text-sm text-mute">التسجيل مقفول حالياً: النسخة تجريبية.</p>
        ) : sent ? (
          <p role="status" className="text-sm">أرسلنا رابط الدخول إلى <bdi dir="ltr">{email}</bdi>. افتحه من نفس الجهاز.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm text-mute">البريد الإلكتروني</span>
              <input
                type="email" dir="ltr" inputMode="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-start"
              />
            </label>
            {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-pulse py-2.5 font-bold text-pulse-ink transition active:scale-[0.98] disabled:opacity-60">
              {busy ? 'جارٍ الإرسال…' : 'أرسل رابط الدخول'}
            </button>
          </form>
        )}
        <p className="flex gap-4 text-xs text-mute">
          <Link to="/privacy" className="hover:text-ink">سياسة الخصوصية</Link>
          <Link to="/terms" className="hover:text-ink">شروط الاستخدام</Link>
        </p>
      </div>
    </main>
  )
}
