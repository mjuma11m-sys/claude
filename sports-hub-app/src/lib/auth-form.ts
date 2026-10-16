/* Pure helpers for the email-link sign-in form, so the parts that cannot be exercised without a real Supabase project are still tested. */
export const RESEND_SECONDS = 60

export const normalizeEmail = (v: string) => v.trim().toLowerCase()
export const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)

/* Supabase answers 429 when the same address (or the project) asked for too many links; its default mail sender is also rate limited. */
export function mapAuthError(e: { status?: number; code?: string; message?: string } | null): string | null {
  if (!e) return null
  if (e.status === 429 || e.code === 'over_email_send_rate_limit' || /rate limit/i.test(e.message ?? '')) return 'طلبت روابط كثيرة. انتظر دقيقة وجرّب مرة ثانية.'
  if (e.code === 'email_address_invalid' || /invalid/i.test(e.message ?? '')) return 'البريد غير صالح. تأكد من كتابته.'
  if (e.status === 0 || /fetch|network/i.test(e.message ?? '')) return 'ما فيه اتصال. تأكد من الإنترنت وجرّب مرة ثانية.'
  return 'ما قدرنا نرسل الرابط، جرّب مرة ثانية.'
}

export const cooldownLeft = (sentAt: number | null, now: number, seconds = RESEND_SECONDS) => (sentAt === null ? 0 : Math.max(0, Math.ceil(seconds - (now - sentAt) / 1000)))
