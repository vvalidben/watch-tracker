import { useEffect, useState } from 'react'
import type { DatabaseInfoDTO } from '@shared/settings'

export interface UseDatabaseInfoResult {
  info: DatabaseInfoDTO | null
  loading: boolean
}

/** Read-only facts about the local database file, for the Settings page. */
export function useDatabaseInfo(): UseDatabaseInfoResult {
  const [info, setInfo] = useState<DatabaseInfoDTO | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    window.api
      .getDatabaseInfo()
      .then((response) => {
        if (!cancelled) setInfo(response)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { info, loading }
}
