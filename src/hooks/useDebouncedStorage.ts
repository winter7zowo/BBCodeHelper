import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/** Keep persistence out of pointer updates, without losing the final edit on exit. */
export function useDebouncedStorage<T>(key: string, value: T, delay = 400) {
  const latestValue = useRef({ key, value })
  const lastWritten = useRef<{ key: string; serialized: string } | null>(null)

  useLayoutEffect(() => {
    latestValue.current = { key, value }
  }, [key, value])

  const write = useCallback(() => {
    try {
      const latest = latestValue.current
      const serialized = JSON.stringify(latest.value)
      if (lastWritten.current?.key === latest.key && lastWritten.current.serialized === serialized) return
      localStorage.setItem(latest.key, serialized)
      lastWritten.current = { key: latest.key, serialized }
    } catch {
      // Editing remains available when storage is full or blocked.
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(write, delay)
    return () => window.clearTimeout(timeout)
  }, [key, value, delay, write])

  useEffect(() => {
    window.addEventListener('pagehide', write)
    return () => window.removeEventListener('pagehide', write)
  }, [write])
}
