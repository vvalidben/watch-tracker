import { useCallback, useEffect, useState } from 'react'
import type { WatchLogEntry } from '@shared/watchLog'

const listeners = new Set<() => void>()

/** Tells every mounted log view, including the always-visible ticker, that something was just marked watched. */
export function invalidateWatchLog(): void {
  listeners.forEach((listener) => listener())
}

export interface UseWatchLogResult {
  entries: WatchLogEntry[]
  loading: boolean
  error: string | null
}

/** Every recorded watch, newest first. One local read, no network involved. */
export function useWatchLog(): UseWatchLogResult {
  const [entries, setEntries] = useState<WatchLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await window.api.getWatchLog()
      setEntries(response.entries)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const listener = (): void => void load()
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [load])

  return { entries, loading, error }
}
