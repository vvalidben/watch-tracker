import type { GetDashboardResponse } from '@shared/dashboard'
import { buildDashboardShelves } from '@shared/dashboardShelves'
import { computeDashboardStats, type DashboardStatsItem } from '@shared/dashboardStats'
import type { Repositories } from '../db/repositories'
import { listLibrary } from './libraryView'

/** Enough to fill a horizontal shelf without turning the dashboard into a second Library page. */
const SHELF_LIMIT = 12

/**
 * One read, entirely local: the full library (already carries progress and
 * lastWatchedAt per item — see libraryView.ts) sliced into shelves, plus a
 * separate watched-episode aggregate for the stats bar. That second query
 * is necessary because LibraryItemDTO.progress is null whenever a show's
 * total episode count isn't cached — which would silently drop those
 * watched episodes from "total episodes watched" if stats were derived
 * from `progress` alone.
 */
export async function computeDashboard(repositories: Repositories): Promise<GetDashboardResponse> {
  const items = await listLibrary(repositories, {})

  const mediaItemIds = items.map((item) => item.mediaItem.id)
  const watchedSummaries = await repositories.episodeProgress.getWatchedSummaryByMediaItemIds(mediaItemIds)
  const totalEpisodesWatched = [...watchedSummaries.values()].reduce((sum, summary) => sum + summary.watchedCount, 0)

  const statsItems: DashboardStatsItem[] = items.map((item) => ({
    type: item.mediaItem.type,
    watchStatus: item.libraryEntry.watchStatus,
    rating: item.libraryEntry.rating,
    favorite: item.libraryEntry.favorite,
    // media_items has no cached runtime yet (see shared/dashboardStats.ts) — always estimated for now.
    runtimeMinutes: null
  }))

  return {
    stats: computeDashboardStats(statsItems, totalEpisodesWatched),
    shelves: buildDashboardShelves(items, SHELF_LIMIT)
  }
}
