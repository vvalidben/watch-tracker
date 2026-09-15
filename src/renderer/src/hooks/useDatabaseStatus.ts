import { useEffect, useState } from 'react'
import type { DatabaseStatusDTO } from '@shared/settings'

export interface UseDatabaseStatusResult {
  status: DatabaseStatusDTO | null
  loading: boolean
}

/** Checked once at startup so the app can show a clear error screen instead of every page failing individually. */
export function useDatabaseStatus(): UseDatabaseStatusResult {
  const [status, setStatus] = useState<DatabaseStatusDTO | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    window.api
      .getDatabaseStatus()
      .then((response) => {
        if (!cancelled) setStatus(response)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus({
            ok: false,
            recoveredFromCorruption: false,
            corruptedFilePath: null,
            error: error instanceof Error ? error.message : String(error),
            dbPath: ''
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { status, loading }
}
