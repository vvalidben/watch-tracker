import { useCallback, useEffect, useState } from 'react'
import type { NormalizedMedia } from '@shared/metadata'
import type { SeriesProgressDTO } from '@shared/library'

export interface UseSeriesProgressResult {
  progress: SeriesProgressDTO | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/** null for a movie — there's no episode progress to summarize. */
export function useSeriesProgress(media: NormalizedMedia): UseSeriesProgressResult {
  const [progress, setProgress] = useState<SeriesProgressDTO | null>(null)
  const [loading, setLoading] = useState(media.mediaType !== 'movie')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    if (media.mediaType === 'movie') {
      setProgress(null)
      return
    }
    const response = await window.api.getSeriesProgress({
      source: media.source,
      mediaType: media.mediaType,
      externalId: media.externalId
    })
    setProgress(response.progress)
    setError(response.error)
  }, [media.source, media.mediaType, media.externalId])

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

  return { progress, loading, error, refresh: load }
}
