import { useCallback, useEffect, useState } from 'react'
import type { NormalizedMedia } from '@shared/metadata'
import type { IpcResult } from '@shared/ipcResult'
import type { LibraryEntryDTO, LibraryStateResult, WatchStatus } from '@shared/library'

export interface UseLibraryStateResult {
  loading: boolean
  /** True while an action (add/remove/favorite/status change) is in flight. */
  pending: boolean
  inLibrary: boolean
  favorite: boolean
  isWatchlisted: boolean
  watchStatus: WatchStatus | null
  /** The overall personal rating for this movie/series ("My Rating") — distinct from media.rating (the external score). */
  rating: number | null
  /** How many times a movie has been (re)completed, beyond the first watch. Always 0 for a TV/anime series. */
  rewatchCount: number
  /** Most recent completion date, kept even after leaving 'completed'. Null if never completed. */
  completedAt: string | null
  /** Personal note on this movie/series/anime as a whole. */
  notes: string | null
  error: string | null
  addToLibrary: () => Promise<void>
  removeFromLibrary: () => Promise<void>
  toggleFavorite: () => Promise<void>
  addToWatchlist: () => Promise<void>
  setStatus: (status: WatchStatus) => Promise<void>
  setRating: (rating: number | null) => Promise<void>
  setNotes: (notes: string | null) => Promise<void>
  /** Full watch-date history for a movie, fetched on demand. Empty for a TV/anime series (its history is per-episode). */
  getMovieHistory: () => Promise<string[]>
  /** Re-fetches from the DB — call after a mutation made through another hook (e.g. episode watched toggles) changes this entry's status. */
  refresh: () => Promise<void>
}

/**
 * Self-contained library state + actions for one title. Drop this into any
 * page that has a NormalizedMedia in hand (Search results, MediaDetail) —
 * it fetches the current state on mount and owns every mutation.
 */
export function useLibraryState(media: NormalizedMedia): UseLibraryStateResult {
  const [libraryEntry, setLibraryEntry] = useState<LibraryEntryDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    const response = await window.api.getLibraryState({ source: media.source, externalId: media.externalId })
    setLibraryEntry(response.libraryEntry)
  }, [media.source, media.externalId])

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

  async function runAction(action: () => Promise<IpcResult<LibraryStateResult>>): Promise<void> {
    setPending(true)
    setError(null)
    const result = await action()
    setPending(false)
    if (result.ok) {
      setLibraryEntry(result.data.libraryEntry)
    } else {
      setError(result.error)
    }
  }

  return {
    loading,
    pending,
    inLibrary: libraryEntry !== null,
    favorite: libraryEntry?.favorite ?? false,
    isWatchlisted: libraryEntry?.watchStatus === 'plan_to_watch',
    watchStatus: libraryEntry?.watchStatus ?? null,
    rating: libraryEntry?.rating ?? null,
    rewatchCount: libraryEntry?.rewatchCount ?? 0,
    completedAt: libraryEntry?.completedAt ?? null,
    notes: libraryEntry?.notes ?? null,
    error,

    addToLibrary: () => runAction(() => window.api.addToLibrary({ media })),

    async removeFromLibrary(): Promise<void> {
      setPending(true)
      setError(null)
      const result = await window.api.removeFromLibrary({ source: media.source, externalId: media.externalId })
      setPending(false)
      if (result.ok) {
        setLibraryEntry(null)
      } else {
        setError(result.error)
      }
    },

    toggleFavorite: () =>
      runAction(() => window.api.setFavorite({ media, favorite: !(libraryEntry?.favorite ?? false) })),

    addToWatchlist: () => runAction(() => window.api.setWatchStatus({ media, watchStatus: 'plan_to_watch' })),

    setStatus: (watchStatus: WatchStatus) => runAction(() => window.api.setWatchStatus({ media, watchStatus })),

    setRating: (rating: number | null) => runAction(() => window.api.rateMedia({ media, rating })),

    setNotes: (notes: string | null) => runAction(() => window.api.setNotes({ media, notes })),

    async getMovieHistory(): Promise<string[]> {
      const response = await window.api.getMovieHistory({ source: media.source, externalId: media.externalId })
      return response.history
    },

    refresh: load
  }
}
