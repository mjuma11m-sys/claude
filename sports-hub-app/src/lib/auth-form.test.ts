import { describe, expect, it } from 'vitest'
import { cooldownLeft, looksLikeEmail, mapAuthError, mapOAuthError, normalizeEmail, OAUTH_LABEL } from './auth-form'

describe('auth form helpers', () => {
  it('trims and lowercases the address', () => { expect(normalizeEmail('  Coach@Club.COM ')).toBe('coach@club.com') })
  it('accepts normal addresses and rejects obvious typos', () => {
    for (const ok of ['a@b.co', 'coach@club.com', 'x.y+z@mail.example.org']) expect(looksLikeEmail(ok)).toBe(true)
    for (const bad of ['', 'a', 'a@b', 'a@b.', '@b.com', 'a b@c.com', 'a@b .com']) expect(looksLikeEmail(bad)).toBe(false)
  })
  it('turns a rate limit into plain Arabic, whichever way Supabase reports it', () => {
    const want = 'طلبت روابط كثيرة. انتظر دقيقة وجرّب مرة ثانية.'
    expect(mapAuthError({ status: 429 })).toBe(want)
    expect(mapAuthError({ code: 'over_email_send_rate_limit' })).toBe(want)
    expect(mapAuthError({ message: 'Email rate limit exceeded' })).toBe(want)
  })
  it('names an invalid address and a missing connection, and falls back to a generic line', () => {
    expect(mapAuthError({ code: 'email_address_invalid' })).toContain('غير صالح')
    expect(mapAuthError({ status: 0, message: 'Failed to fetch' })).toContain('اتصال')
    expect(mapAuthError({ status: 500 })).toContain('ما قدرنا')
    expect(mapAuthError(null)).toBeNull()
  })
  it('counts the resend cooldown down to zero and never below', () => {
    expect(cooldownLeft(null, 5000)).toBe(0)
    expect(cooldownLeft(1000, 1000)).toBe(60)
    expect(cooldownLeft(1000, 31_000)).toBe(30)
    expect(cooldownLeft(1000, 61_000)).toBe(0)
    expect(cooldownLeft(1000, 999_000)).toBe(0)
  })
})

describe('oauth helpers', () => {
  it('has no error when there is no error', () => { expect(mapOAuthError(null)).toBeNull() })
  it('tells the person what to do, without technical detail', () => {
    expect(mapOAuthError({ message: 'Unsupported provider: provider is not enabled' })).toBe('ما قدرنا نكمل الدخول عبر المزوّد. جرّب مرة ثانية أو ادخل بالبريد.')
    expect(mapOAuthError({ status: 0, message: 'Failed to fetch' })).toContain('اتصال')
  })
  it('labels both providers in Arabic', () => { expect(OAUTH_LABEL.google).toBe('تابع مع Google'); expect(OAUTH_LABEL.apple).toBe('تابع مع Apple') })
})
