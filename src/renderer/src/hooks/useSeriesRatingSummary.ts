import { useCallback, useEffect, useState } from 'react'
import type { NormalizedMedia } from '@shared/metadata'
import type { SeriesRatingSummaryDTO } from '@shared/library'

export interface UseSeriesRatingSummaryResult {
  summary: SeriesRatingSummaryDTO | null
  loading: boolean
  refresh: () => Promise<void>
}

/** Series-wide rating rollups (average season rating, average episode rating) — tv/anime only. */
export function useSeriesRatingSummary(media: NormalizedMedia): UseSeriesRatingSummaryResult {
  const [summary, setSummary] = useState<SeriesRatingSummaryDTO | null>(null)
  const [loading, setLoading] = useState(media.mediaType !== 'movie')

  const load = useCallback(async (): Promise<void> => {
    if (media.mediaType === 'movie') {
      setSummary(null)
      return
    }
    const response = await window.api.getSeriesRatingSummary({ source: media.source, externalId: media.externalId })
    setSummary(response.summary)
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

  return { summary, loading, refresh: load }
}
