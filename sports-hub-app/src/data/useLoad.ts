import { useCallback, useEffect, useState } from 'react'

type Load<T> = { data: T | undefined; error: unknown; loading: boolean; reload: () => void }

/* Minimal fetch-on-mount hook; ignores results that arrive after unmount or a newer reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []): Load<T> {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true }))
    fn().then(
      (data) => live && setState({ data, loading: false }),
      (error) => live && setState({ error, loading: false }),
    )
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { data: state.data, error: state.error, loading: state.loading, reload: useCallback(() => setTick((t) => t + 1), []) }
}
