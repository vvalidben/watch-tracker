import { useCallback, useEffect, useRef, useState } from 'react'
import type { NormalizedMedia } from '@shared/metadata'

export interface EpisodeWithProgress {
  episodeNumber: number
  title: string | null
  overview: string | null
  airDate: string | null
  runtimeMinutes: number | null
  watched: boolean
  /** Most recent watch date, kept even after the episode is later marked unwatched. */
  watchedAt: string | null
  rating: number | null
  /** Total times marked watched, rewatches included (0 if never watched). */
  watchCount: number
  /** Personal note on this specific episode. */
  notes: string | null
}

export interface UseEpisodesResult {
  episodes: EpisodeWithProgress[]
  loading: boolean
  /** True while a season-wide bulk action is in flight. */
  bulkPending: boolean
  error: string | null
  /** True while a watched-toggle or rating change for this specific episode is in flight — for disabling its controls against a double-click race. */
  isPending: (episodeNumber: number) => boolean
  setWatched: (episodeNumber: number, watched: boolean) => Promise<void>
  rate: (episodeNumber: number, rating: number | null) => Promise<void>
  setNotes: (episodeNumber: number, notes: string | null) => Promise<void>
  setSeasonWatched: (watched: boolean) => Promise<void>
  /** Fetches the full watch-date history for one episode, on demand (not preloaded for every row). */
  getHistory: (episodeNumber: number) => Promise<string[]>
  refresh: () => Promise<void>
}

/**
 * Merges live provider episode metadata with this app's own watched/rating
 * data for the same season, and exposes optimistic mutations for both plus
 * a season-wide bulk action. `onWatchedChange` fires after a mutation that
 * can affect the parent series' watch status/progress; `onRatingChange`
 * fires after a rating changes (affects the series' average-rating rollup
 * instead) — kept separate so the caller can refresh only what's relevant.
 */
export function useEpisodes(
  media: NormalizedMedia,
  seasonNumber: number | null,
  onWatchedChange?: () => void,
  onRatingChange?: () => void
): UseEpisodesResult {
  const [episodes, setEpisodes] = useState<EpisodeWithProgress[]>([])
  const [loading, setLoading] = useState(seasonNumber !== null)
  const [bulkPending, setBulkPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A ref (not state) so the re-entrancy check below is synchronous — two
  // rapid clicks on the same episode land in the same render tick, before
  // any state update from the first click would have been applied yet.
  const pendingEpisodesRef = useRef<Set<number>>(new Set())
  const [, forceRender] = useState(0)

  function isPending(episodeNumber: number): boolean {
    return pendingEpisodesRef.current.has(episodeNumber)
  }

  function setPending(episodeNumber: number, pending: boolean): void {
    if (pending) pendingEpisodesRef.current.add(episodeNumber)
    else pendingEpisodesRef.current.delete(episodeNumber)
    forceRender((n) => n + 1)
  }

  const load = useCallback(async (): Promise<void> => {
    if (seasonNumber === null) {
      setEpisodes([])
      return
    }
    const [episodesResponse, progressResponse] = await Promise.all([
      window.api.getEpisodes({
        source: media.source,
        mediaType: media.mediaType,
        externalId: media.externalId,
        seasonNumber
      }),
      window.api.getEpisodeProgress({ source: media.source, externalId: media.externalId, seasonNumber })
    ])
    const merged = episodesResponse.episodes.map((episode) => {
      const progress = progressResponse.episodes[episode.episodeNumber]
      return {
        ...episode,
        watched: progress?.watched ?? false,
        watchedAt: progress?.watchedAt ?? null,
        rating: progress?.rating ?? null,
        watchCount: progress?.watchCount ?? 0,
        notes: progress?.notes ?? null
      }
    })
    setEpisodes(merged)
    setError(episodesResponse.error?.message ?? null)
  }, [media.source, media.mediaType, media.externalId, seasonNumber])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
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

  async function setWatched(episodeNumber: number, watched: boolean): Promise<void> {
    // Guards against a double-click firing this twice before the first
    // round trip completes — without this, two rapid clicks could both
    // read the same pre-update `watched` value and send two "mark
    // watched" calls, recording a phantom rewatch for a single click.
    if (isPending(episodeNumber)) return
    setPending(episodeNumber, true)
    try {
      // Marking watched (including a rewatch) always adds to the count;
      // unwatching leaves it alone — history isn't undone by unwatching.
      setEpisodes((prev) =>
        prev.map((e) => (e.episodeNumber === episodeNumber ? { ...e, watched, watchCount: watched ? e.watchCount + 1 : e.watchCount } : e))
      )
      if (seasonNumber === null) return
      const result = await window.api.setEpisodeWatched({ media, seasonNumber, episodeNumber, watched })
      if (!result.ok) {
        setEpisodes((prev) =>
          prev.map((e) =>
            e.episodeNumber === episodeNumber ? { ...e, watched: !watched, watchCount: watched ? e.watchCount - 1 : e.watchCount } : e
          )
        )
        setError(result.error)
        return
      }
      // Reconcile with the server's authoritative watchCount rather than trust the optimistic bump.
      setEpisodes((prev) =>
        prev.map((e) =>
          e.episodeNumber === episodeNumber
            ? { ...e, watchCount: result.data.progress.watchCount, watchedAt: result.data.progress.watchedAt }
            : e
        )
      )
      onWatchedChange?.()
    } finally {
      setPending(episodeNumber, false)
    }
  }

  async function rate(episodeNumber: number, rating: number | null): Promise<void> {
    if (isPending(episodeNumber)) return
    setPending(episodeNumber, true)
    try {
      const previous = episodes.find((e) => e.episodeNumber === episodeNumber)?.rating ?? null
      setEpisodes((prev) => prev.map((e) => (e.episodeNumber === episodeNumber ? { ...e, rating } : e)))
      if (seasonNumber === null) return
      const result = await window.api.rateEpisode({ media, seasonNumber, episodeNumber, rating })
      if (!result.ok) {
        setEpisodes((prev) => prev.map((e) => (e.episodeNumber === episodeNumber ? { ...e, rating: previous } : e)))
        setError(result.error)
        return
      }
      onRatingChange?.()
    } finally {
      setPending(episodeNumber, false)
    }
  }

  async function setNotes(episodeNumber: number, notes: string | null): Promise<void> {
    const previous = episodes.find((e) => e.episodeNumber === episodeNumber)?.notes ?? null
    setEpisodes((prev) => prev.map((e) => (e.episodeNumber === episodeNumber ? { ...e, notes } : e)))
    if (seasonNumber === null) return
    const result = await window.api.setEpisodeNotes({ media, seasonNumber, episodeNumber, notes })
    if (!result.ok) {
      setEpisodes((prev) => prev.map((e) => (e.episodeNumber === episodeNumber ? { ...e, notes: previous } : e)))
      setError(result.error)
    }
  }

  async function setSeasonWatched(watched: boolean): Promise<void> {
    if (seasonNumber === null) return
    setBulkPending(true)
    setError(null)
    const result = await window.api.setSeasonWatched({ media, seasonNumber, watched })
    setBulkPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await load()
    onWatchedChange?.()
  }

  async function getHistory(episodeNumber: number): Promise<string[]> {
    if (seasonNumber === null) return []
    const response = await window.api.getEpisodeHistory({
      source: media.source,
      externalId: media.externalId,
      seasonNumber,
      episodeNumber
    })
    return response.history
  }

  return { episodes, loading, bulkPending, error, isPending, setWatched, rate, setNotes, setSeasonWatched, getHistory, refresh: load }
}
