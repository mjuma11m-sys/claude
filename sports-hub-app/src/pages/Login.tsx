import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from '../components/Icon'
import { Logo, Wordmark } from '../components/Logo'
import { PitchLines } from '../components/PitchLines'
import { PRIVACY_CONTACT } from '../lib/legal'
import { supabase } from '../lib/supabase'
import type { IconName } from '../components/Icon'
import { DEMO_ROLES, ROLE_LABEL, type Role } from '../lib/roles'
import { cooldownLeft, looksLikeEmail, mapAuthError, normalizeEmail } from '../lib/auth-form'

const ROLE_ICON: Record<Role, IconName> = { club_admin: 'club', bfa_admin: 'hub', medical: 'pulse', fan: 'vote', player: 'vote' }

export function Login() {
  const { user, demo, signInDemo } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [sentAt, setSentAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const sent = sentAt !== null
  const wait = cooldownLeft(sentAt, now)
  useEffect(() => { if (sentAt === null || wait === 0) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [sentAt, wait])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />

  async function send() {
    if (!supabase) return
    const address = normalizeEmail(email)
    if (!looksLikeEmail(address)) { setError('البريد غير صالح. تأكد من كتابته.'); return }
    setBusy(true)
    setError(null)
    // The link lands back on this origin; the address is sent as typed once trimmed, so the same person always reaches the same account.
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin } })
    const msg = mapAuthError(error)
    if (msg) setError(msg)
    else { setEmail(address); setNow(Date.now()); setSentAt(Date.now()) }
    setBusy(false)
  }
  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send() }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden p-4">
      <PitchLines className="text-white/[0.05]" />
      <div className="glass rise relative w-full max-w-sm space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Logo className="size-10" />
          <div>
            <h1 className="text-xl"><Wordmark /></h1>
            <p className="text-sm text-mute">غرف عمل للأندية والاتحاد: الدوري الممتاز والدرجة الثانية</p>
          </div>
        </div>

        {demo ? (
          <div className="space-y-3">
            <p className="text-sm text-mute">وضع تجريبي: اختر الدور عشان تشوف الواجهة اللي تطلع له. أندية الاتحاد والأرقام المالية بالوضع التجريبي كلها خيالية.</p>
            <div className="grid gap-2">
              {DEMO_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => signInDemo(r)}
                  className="stub flex min-h-14 items-center gap-3 bg-white/[0.06] px-5 text-start transition-colors hover:bg-pulse/10 active:scale-[0.99]"
                >
                  <Icon name={ROLE_ICON[r]} className="size-5 text-pulse" />
                  <span className="font-display text-xl">{ROLE_LABEL[r]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : !PRIVACY_CONTACT ? (
          <p role="status" className="text-sm text-mute">التسجيل مقفول حالياً: النسخة تجريبية.</p>
        ) : sent ? (
          <div className="space-y-3">
            <p role="status" className="text-sm">أرسلنا رابط الدخول إلى <bdi dir="ltr">{email}</bdi>. افتحه من نفس الجهاز وبنفس المتصفح. لو ما وصل، شوف مجلد الرسائل غير المرغوبة.</p>
            {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || wait > 0} onClick={() => void send()} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm disabled:opacity-60">{wait > 0 ? <>أعد الإرسال بعد <span className="num">{wait}</span> ثانية</> : 'أعد إرسال الرابط'}</button>
              <button type="button" onClick={() => { setSentAt(null); setError(null) }} className="min-h-11 rounded-xl px-4 text-sm text-mute underline underline-offset-4">غيّر البريد</button>
            </div>
          </div>
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
