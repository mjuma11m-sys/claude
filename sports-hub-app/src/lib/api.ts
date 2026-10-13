import { supabase } from './supabase'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Matches the Flask error shape: { error: { code, message, fields? } } */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: unknown) {
    super(message)
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null
  const headers = new Headers(init.headers)
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
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
