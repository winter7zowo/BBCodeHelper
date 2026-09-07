import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/** Keep only the latest pointer sample per paint; flush the final sample on release. */
export function useRafCallback<Args extends unknown[]>(callback: (...args: Args) => void) {
  const latestCallback = useRef(callback)
  const frame = useRef<number | null>(null)
  const pending = useRef<Args | null>(null)

  useLayoutEffect(() => { latestCallback.current = callback }, [callback])

  const flush = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    const args = pending.current
    pending.current = null
    if (args) latestCallback.current(...args)
  }, [])

  const schedule = useCallback((...args: Args) => {
    pending.current = args
    if (frame.current === null) frame.current = requestAnimationFrame(flush)
  }, [flush])

  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    pending.current = null
  }, [])

  useEffect(() => cancel, [cancel])
  return { schedule, flush, cancel }
}
