import { useCallback, useEffect, useState } from 'react'
import type { GetDashboardResponse } from '@shared/dashboard'

export interface UseDashboardResult {
  data: GetDashboardResponse | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<GetDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    const response = await window.api.getDashboard()
    setData(response)
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

  return { data, loading, error, refresh: load }
}
