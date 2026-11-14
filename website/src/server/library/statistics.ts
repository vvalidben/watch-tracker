import { computeStatistics } from '@shared/statistics'
import type { GetStatisticsResponse } from '@shared/statistics'
import type { Repositories } from '../db/repositories'
import { listLibrary } from './libraryView'

/**
 * One read, entirely local: the full library (for ratings/genres/status
 * breakdown) plus every watch event belonging to a currently-libraried
 * media item (for the monthly trend charts and the episode-count total).
 * Scoping watch events to `mediaItemIds` from the current library is what
 * keeps the charts correct after a title is removed — its history stops
 * counting the moment it's no longer tracked, same as everywhere else in
 * this app that derives numbers from `listLibrary`.
 */
export async function computeLibraryStatistics(repositories: Repositories): Promise<GetStatisticsResponse> {
  const items = await listLibrary(repositories, {})
  const mediaItemIds = items.map((item) => item.mediaItem.id)

  const [watchedSummaries, allEvents] = await Promise.all([
    repositories.episodeProgress.getWatchedSummaryByMediaItemIds(mediaItemIds),
    repositories.watchEvents.listAllForMediaItems(mediaItemIds)
  ])
  const totalEpisodesWatched = [...watchedSummaries.values()].reduce((sum, summary) => sum + summary.watchedCount, 0)

  const episodeWatchedAts = allEvents.filter((event) => event.episodeId !== null).map((event) => event.watchedAt)
  const movieWatchedAts = allEvents.filter((event) => event.episodeId === null).map((event) => event.watchedAt)

  return {
    statistics: computeStatistics({
      items,
      totalEpisodesWatched,
      movieWatchedAts,
      episodeWatchedAts,
      referenceDate: new Date()
    })
  }
}
