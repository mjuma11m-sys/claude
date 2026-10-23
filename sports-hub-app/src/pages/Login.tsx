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
import { cooldownLeft, looksLikeEmail, mapAuthError, mapOAuthError, normalizeEmail, OAUTH_LABEL, type OAuthProvider } from '../lib/auth-form'
import { OAUTH_PROVIDERS } from '../lib/features'

const PROVIDER_MARK: Record<OAuthProvider, string> = {
  google: 'M21.35 11.1H12v3.8h5.35c-.5 2.4-2.5 3.8-5.35 3.8a6 6 0 1 1 0-12c1.5 0 2.85.55 3.9 1.45l2.7-2.7A9.8 9.8 0 0 0 12 2.2a9.8 9.8 0 1 0 0 19.6c5.65 0 9.4-3.95 9.4-9.55 0-.4-.02-.8-.05-1.15z',
  apple: 'M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.15-2.8.85-3.5.85s-1.8-.8-3-.8C6.9 7.4 5.5 8.3 4.7 9.7c-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.75 3-.75s1.8.75 3 .72c1.25 0 2.05-1.1 2.8-2.2.9-1.3 1.25-2.5 1.27-2.6-.03 0-2.45-.95-2.47-3.77zM14.1 5.8c.65-.8 1.1-1.9.95-3-.95.04-2.1.65-2.8 1.45-.6.7-1.15 1.85-1 2.9 1.05.08 2.1-.55 2.85-1.35z',
}

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
  async function viaProvider(provider: OAuthProvider) {
    if (!supabase) return
    setBusy(true)
    setError(null)
    // Leaves for the provider and comes back to this origin; the profile row is created by the same database trigger as for email sign-in.
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
    const msg = mapOAuthError(error)
    if (msg) { setError(msg); setBusy(false) }
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
          <div className="space-y-4">
          {OAUTH_PROVIDERS.length > 0 && (
            <div className="space-y-2">
              {OAUTH_PROVIDERS.map((p) => (
                <button key={p} type="button" disabled={busy} onClick={() => void viaProvider(p)} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 font-bold transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-60">
                  <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current"><path d={PROVIDER_MARK[p]} /></svg>
                  {OAUTH_LABEL[p]}
                </button>
              ))}
              <p className="flex items-center gap-3 text-xs text-mute"><span className="h-px flex-1 bg-white/10" />أو بالبريد<span className="h-px flex-1 bg-white/10" /></p>
            </div>
          )}
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
          </div>
        )}
        <p className="flex gap-4 text-xs text-mute">
          <Link to="/privacy" className="hover:text-ink">سياسة الخصوصية</Link>
          <Link to="/terms" className="hover:text-ink">شروط الاستخدام</Link>
        </p>
      </div>
    </main>
  )
}
