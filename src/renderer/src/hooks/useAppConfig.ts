import { useCallback, useEffect, useState } from 'react'
import type { AppConfigDTO } from '@shared/settings'

export interface UseAppConfigResult {
  config: AppConfigDTO | null
  loading: boolean
  pending: boolean
  error: string | null
  saveTmdbApiKey: (apiKey: string | null) => Promise<boolean>
  refresh: () => Promise<void>
}

/** Machine-local app configuration (API key, remembered backup folder) — see shared/settings.ts. */
export function useAppConfig(): UseAppConfigResult {
  const [config, setConfig] = useState<AppConfigDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    const response = await window.api.getAppConfig()
    setConfig(response)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  async function saveTmdbApiKey(apiKey: string | null): Promise<boolean> {
    setPending(true)
    setError(null)
    const result = await window.api.setTmdbApiKey({ apiKey })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return false
    }
    await load()
    return true
  }

  return { config, loading, pending, error, saveTmdbApiKey, refresh: load }
}
