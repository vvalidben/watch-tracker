import type { ListLibraryRequest, LibraryItemDTO } from '@shared/library'
import { sortLibraryItems } from '@shared/librarySort'
import type { Repositories } from '../db/repositories'
import { toLibraryEntryDTO, toMediaItemDTO } from './dto'

/**
 * The Library page's one read: a SQL-level filter (status/type/favorite/
 * search) via listLibraryView, one grouped query for watched-episode
 * summaries, then merge + sort in memory. Nothing here ever calls a
 * metadata provider — total episode counts come from media_items'
 * cached numberOfEpisodes (set at add-time), not a live fetch.
 */
export async function listLibrary(repositories: Repositories, request: ListLibraryRequest): Promise<LibraryItemDTO[]> {
  const tagMediaItemIds =
    request.tagId !== undefined ? await repositories.tags.listMediaItemIdsForTag(request.tagId) : undefined

  const entries = await repositories.libraryEntries.listLibraryView({
    watchStatus: request.status && request.status !== 'all' ? request.status : undefined,
    favorite: request.favoritesOnly ? true : undefined,
    type: request.type && request.type !== 'all' ? request.type : undefined,
    mediaItemIds: tagMediaItemIds,
    search: request.search
  })

  const mediaItemIds = entries.map((entry) => entry.mediaItem.id)
  const watchedSummaries = await repositories.episodeProgress.getWatchedSummaryByMediaItemIds(mediaItemIds)

  const items: LibraryItemDTO[] = entries.map((entry) => {
    const summary = watchedSummaries.get(entry.mediaItem.id)
    const watchedCount = summary?.watchedCount ?? 0
    const totalEpisodes = entry.mediaItem.numberOfEpisodes

    const progress =
      entry.mediaItem.type === 'movie' || totalEpisodes === null
        ? null
        : {
            watchedEpisodes: Math.min(watchedCount, totalEpisodes),
            totalEpisodes,
            percentage: totalEpisodes > 0 ? Math.round((Math.min(watchedCount, totalEpisodes) / totalEpisodes) * 100) : 0
          }

    const lastWatchedAt = entry.mediaItem.type === 'movie' ? entry.completedAt : (summary?.lastWatchedAt ?? null)

    return {
      mediaItem: toMediaItemDTO(entry.mediaItem),
      libraryEntry: toLibraryEntryDTO(entry),
      progress,
      lastWatchedAt
    }
  })

  return sortLibraryItems(items, request.sort ?? 'recently_added')
}
