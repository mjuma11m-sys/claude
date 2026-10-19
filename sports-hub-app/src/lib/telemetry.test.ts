import { describe, expect, it, vi } from 'vitest'
import { createReporter, MAX_ERRORS_PER_SESSION, routePattern, sanitize, topStack } from './telemetry'

describe('telemetry', () => {
  it('turns a route into a pattern and ignores unknown ones', () => {
    expect(routePattern('/player/4f2a-9')).toBe('/player/:id')
    expect(routePattern('/analysis/')).toBe('/analysis')
    expect(routePattern('/club')).toBe('/club')
    expect(routePattern('/federation')).toBeNull()
    expect(routePattern('/player/a/b')).toBeNull()
    expect(routePattern('/admin/secret')).toBeNull()
  })
  it('strips emails, ids and long numbers, collapses spaces and caps the length', () => {
    expect(sanitize('Cannot read coach@club.com  of 3f2b8c1e-1111-4222-8333-444455556666 (CPR 123456789)')).toBe('Cannot read <email> of <id> (CPR <n>)')
    expect(sanitize('x'.repeat(500)).length).toBe(200)
    expect(sanitize('line1\n   line2')).toBe('line1 line2')
    expect(sanitize('rating 5 of 7')).toBe('rating 5 of 7')
  })
  it('keeps the top of a stack only', () => {
    expect(topStack('a\nb\nc\nd\ne')).toBe('a | b | c')
    expect(topStack(undefined)).toBeUndefined()
  })
  it('sends one report per distinct error, at most five a session, and never leaks the address', () => {
    const send = vi.fn(() => Promise.resolve())
    const report = createReporter(send, () => '/player/9f3a')
    expect(report(new Error('boom for a@b.com'))).toBe(true)
    expect(report(new Error('boom for a@b.com'))).toBe(false)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ route: '/player/:id', message: 'Error: boom for <email>' }))
    for (let i = 0; i < 10; i++) report(new Error('e' + i))
    expect(send.mock.calls.length).toBe(MAX_ERRORS_PER_SESSION)
  })
  it('survives a failing sender and a non-Error throw', async () => {
    const report = createReporter(() => Promise.reject(new Error('offline')), () => '/club')
    expect(report('a string')).toBe(true)
    expect(report({ weird: true })).toBe(true)
    await new Promise((r) => setTimeout(r, 0))
  })
})
