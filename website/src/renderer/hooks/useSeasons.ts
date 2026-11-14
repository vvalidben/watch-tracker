import { useEffect, useState } from 'react'
import type { NormalizedMedia, NormalizedSeason } from '@shared/metadata'

export interface UseSeasonsResult {
  seasons: NormalizedSeason[]
  loading: boolean
  error: string | null
}

/** Movies resolve instantly with an empty list — there's nothing to fetch. */
export function useSeasons(media: NormalizedMedia): UseSeasonsResult {
  const [seasons, setSeasons] = useState<NormalizedSeason[]>([])
  const [loading, setLoading] = useState(media.mediaType !== 'movie')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (media.mediaType === 'movie') {
      setSeasons([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    window.api
      .getSeasons({ source: media.source, mediaType: media.mediaType, externalId: media.externalId })
      .then((response) => {
        if (cancelled) return
        setSeasons(response.seasons)
        setError(response.error?.message ?? null)
      })
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
  }, [media.source, media.mediaType, media.externalId])

  return { seasons, loading, error }
}
