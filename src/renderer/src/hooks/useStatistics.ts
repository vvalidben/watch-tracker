import { useCallback, useEffect, useState } from 'react'
import type { LibraryStatistics } from '@shared/statistics'

export interface UseStatisticsResult {
  statistics: LibraryStatistics | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/** Drives the Statistics page. Everything comes from one local, read-only IPC call — no network involved. */
export function useStatistics(): UseStatisticsResult {
  const [statistics, setStatistics] = useState<LibraryStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    const response = await window.api.getStatistics()
    setStatistics(response.statistics)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    load()
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  return { statistics, loading, error, refresh: load }
}
