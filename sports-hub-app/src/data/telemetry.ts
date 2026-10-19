/* Sends error reports and screen counts to the database (0017). Real mode only; every call is fire-and-forget and can never throw. */
import { supabase } from '../lib/supabase'
import { createReporter, routePattern } from '../lib/telemetry'

let installed = false

export function installErrorReporting() {
  if (!supabase || installed) return
  installed = true
  const report = createReporter(async (r) => { await supabase!.rpc('report_client_error', { p_route: r.route, p_message: r.message, p_stack: r.stack ?? null, p_version: r.version }) })
  addEventListener('error', (e) => { report(e.error ?? e.message) })
  addEventListener('unhandledrejection', (e) => { report(e.reason) })
  reportRouteError = report
}

export let reportRouteError: (err: unknown) => void = () => {}

export function trackScreen(pathname: string, role: string) {
  const route = routePattern(pathname)
  if (!supabase || !route || (role !== 'club_admin' && role !== 'medical')) return
  void Promise.resolve(supabase.rpc('track_screen', { p_route: route })).catch(() => { /* counting must never break a screen */ })
}
