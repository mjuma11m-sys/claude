/* Self-hosted error reports and screen counts (migration 0017). Nothing personal leaves the browser: messages lose emails, ids and long
   numbers; routes lose their ids; a session sends each distinct error once and at most five in total. Real mode only. */
export const MAX_ERRORS_PER_SESSION = 5
export const APP_VERSION = 'web'

const KNOWN = new Set(['/club', '/lineup', '/analysis', '/attendance', '/development', '/data', '/rights', '/report', '/medical', '/standings', '/settings'])

/* '/player/abc-123' -> '/player/:id'; anything the database does not know is not counted. */
export function routePattern(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (/^\/player\/[^/]+$/.test(p)) return '/player/:id'
  return KNOWN.has(p) ? p : null
}

export function sanitize(text: string, max = 200): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<id>')
    .replace(/\d{6,}/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export const topStack = (stack: string | undefined, lines = 3) => (stack ? sanitize(stack.split('\n').slice(0, lines).join(' | '), 600) : undefined)

export type Send = (r: { route: string; message: string; stack?: string; version: string }) => Promise<unknown>

export function createReporter(send: Send, now = () => location.pathname) {
  const seen = new Set<string>()
  return (err: unknown): boolean => {
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'unknown error')
    const message = sanitize(`${e.name}: ${e.message}`)
    if (seen.has(message) || seen.size >= MAX_ERRORS_PER_SESSION) return false
    seen.add(message)
    const route = routePattern(now()) ?? sanitize(now(), 80)
    void Promise.resolve(send({ route, message, stack: topStack(e.stack), version: APP_VERSION })).catch(() => { /* reporting must never throw */ })
    return true
  }
}
