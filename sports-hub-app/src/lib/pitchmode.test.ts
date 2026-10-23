import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PITCH_KEY, applyPitch, readPitch, setPitch } from './pitchmode'

// vitest runs in node here: stand in for the two browser objects the module touches.
function fakeBrowser(blocked = false) {
  const store = new Map<string, string>()
  const attrs = new Set<string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => { if (blocked) throw new Error('blocked'); return store.get(k) ?? null },
    setItem: (k: string, v: string) => { if (blocked) throw new Error('blocked'); store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  })
  const root = { setAttribute: (k: string) => attrs.add(k), removeAttribute: (k: string) => attrs.delete(k), hasAttribute: (k: string) => attrs.has(k) }
  vi.stubGlobal('document', { documentElement: root })
  return { store, root }
}

describe('pitch mode', () => {
  beforeEach(() => { vi.unstubAllGlobals() })

  it('is off by default', () => { fakeBrowser(); expect(readPitch()).toBe(false) })

  it('turning it on stores the preference and marks <html>', () => {
    const { store, root } = fakeBrowser()
    setPitch(true)
    expect(store.get(PITCH_KEY)).toBe('1')
    expect(readPitch()).toBe(true)
    expect(root.hasAttribute('data-pitch')).toBe(true)
  })

  it('turning it off removes both', () => {
    const { store, root } = fakeBrowser()
    setPitch(true); setPitch(false)
    expect(store.has(PITCH_KEY)).toBe(false)
    expect(root.hasAttribute('data-pitch')).toBe(false)
  })

  it('applyPitch does not touch storage', () => {
    const { store, root } = fakeBrowser()
    applyPitch(true, root as unknown as HTMLElement)
    expect(store.size).toBe(0)
    expect(root.hasAttribute('data-pitch')).toBe(true)
  })

  it('survives a blocked localStorage: still applies for this visit', () => {
    const { root } = fakeBrowser(true)
    expect(readPitch()).toBe(false)
    expect(() => setPitch(true)).not.toThrow()
    expect(root.hasAttribute('data-pitch')).toBe(true)
  })
})
