import { useCallback, useEffect, useState } from 'react'
import type { NormalizedMedia } from '@shared/metadata'

export interface UseSeasonRatingResult {
  rating: number | null
  /** Personal note on this season as a whole — separate from any one episode's note. */
  notes: string | null
  loading: boolean
  pending: boolean
  error: string | null
  setRating: (rating: number | null) => Promise<void>
  setNotes: (notes: string | null) => Promise<void>
}

/** The season's own personal rating and note — separate from any episode-level data. */
export function useSeasonRating(media: NormalizedMedia, seasonNumber: number | null): UseSeasonRatingResult {
  const [rating, setRatingState] = useState<number | null>(null)
  const [notes, setNotesState] = useState<string | null>(null)
  const [loading, setLoading] = useState(seasonNumber !== null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    if (seasonNumber === null) {
      setRatingState(null)
      setNotesState(null)
      return
    }
    const response = await window.api.getSeasonRating({
      source: media.source,
      externalId: media.externalId,
      seasonNumber
    })
    setRatingState(response.rating)
    setNotesState(response.notes)
  }, [media.source, media.externalId, seasonNumber])

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

  async function setRating(nextRating: number | null): Promise<void> {
    if (seasonNumber === null) return
    setPending(true)
    setError(null)
    const result = await window.api.rateSeason({ media, seasonNumber, rating: nextRating })
    setPending(false)
    if (result.ok) {
      setRatingState(result.data.rating)
    } else {
      setError(result.error)
    }
  }

  async function setNotes(nextNotes: string | null): Promise<void> {
    if (seasonNumber === null) return
    setPending(true)
    setError(null)
    const result = await window.api.setSeasonNotes({ media, seasonNumber, notes: nextNotes })
    setPending(false)
    if (result.ok) {
      setNotesState(result.data.notes)
    } else {
      setError(result.error)
    }
  }

  return { rating, notes, loading, pending, error, setRating, setNotes }
}
