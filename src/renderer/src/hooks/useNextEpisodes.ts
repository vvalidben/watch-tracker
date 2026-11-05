import { useEffect, useState } from 'react'
import type { LibraryItemDTO, SeriesProgressDTO } from '@shared/library'

export interface UseNextEpisodesResult {
  /** Keyed by media item id. Missing when the provider couldn't be reached, in which case cards fall back to cached counts. */
  progressById: Map<number, SeriesProgressDTO>
  loading: boolean
}

/**
 * Which episode comes next depends on the provider's season list, so this is
 * a network read (see computeSeriesProgress). That's why it's only done for
 * the few Continue watching cards, and is best-effort: being offline costs a
 * card its "Season 2, Episode 5" line, never the page.
 */
export function useNextEpisodes(items: readonly LibraryItemDTO[]): UseNextEpisodesResult {
  const [progressById, setProgressById] = useState<Map<number, SeriesProgressDTO>>(new Map())
  const [loading, setLoading] = useState(false)

  // Includes what changes when an episode is marked, so marking one re-reads which is next.
  const requestKey = items
    .map((item) => `${item.mediaItem.id}:${item.progress?.watchedEpisodes ?? ''}:${item.lastWatchedAt ?? ''}`)
    .join('|')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load(): Promise<void> {
      const series = items.filter(
        (item) => item.mediaItem.type !== 'movie' && item.mediaItem.source !== 'manual' && item.mediaItem.sourceId !== null
      )
      const results = await Promise.all(
        series.map(async (item): Promise<[number, SeriesProgressDTO | null]> => {
          try {
            const response = await window.api.getSeriesProgress({
              source: item.mediaItem.source as Exclude<typeof item.mediaItem.source, 'manual'>,
              mediaType: item.mediaItem.type,
              externalId: item.mediaItem.sourceId as string
            })
            return [item.mediaItem.id, response.progress]
          } catch {
            return [item.mediaItem.id, null]
          }
        })
      )
      if (cancelled) return
      setProgressById(new Map(results.filter((entry): entry is [number, SeriesProgressDTO] => entry[1] !== null)))
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestKey is the value-based identity of `items`, which is a new array on every refresh
  }, [requestKey])

  return { progressById, loading }
}
