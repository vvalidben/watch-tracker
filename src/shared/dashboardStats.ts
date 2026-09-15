import { averageRating } from './ratings'
import type { WatchStatus } from './library'
import type { MediaType } from './metadata'

/**
 * Reasonable defaults for "estimated" watch time — this app deliberately
 * doesn't cache per-episode runtimes locally (see ensureLocalMedia.ts's
 * "don't duplicate metadata" policy), so exact totals aren't available
 * without calling the provider. The stat is explicitly labeled "estimated"
 * for this reason.
 */
export const DEFAULT_MOVIE_RUNTIME_MINUTES = 110
export const DEFAULT_EPISODE_RUNTIME_MINUTES = 24

export interface DashboardStatsItem {
  type: MediaType
  watchStatus: WatchStatus
  rating: number | null
  favorite: boolean
  /** Cached real runtime when known (movies only, today always null — see the constant above). */
  runtimeMinutes: number | null
}

export interface DashboardStats {
  moviesWatched: number
  seriesCompleted: number
  animeCompleted: number
  totalEpisodesWatched: number
  estimatedWatchTimeMinutes: number
  /** Average of every item's own personal rating (not episode/season ratings). Null if nothing is rated. */
  averagePersonalRating: number | null
  favoritesCount: number
}

/**
 * Pure aggregate over the whole library. `totalEpisodesWatched` is passed
 * in separately (rather than derived from `items`) because it must count
 * every watched episode even for shows whose total episode count isn't
 * cached yet — see src/main/library/dashboard.ts.
 */
export function computeDashboardStats(items: DashboardStatsItem[], totalEpisodesWatched: number): DashboardStats {
  const moviesWatched = items.filter((item) => item.type === 'movie' && item.watchStatus === 'completed').length
  const seriesCompleted = items.filter((item) => item.type === 'tv' && item.watchStatus === 'completed').length
  const animeCompleted = items.filter((item) => item.type === 'anime' && item.watchStatus === 'completed').length
  const favoritesCount = items.filter((item) => item.favorite).length
  const averagePersonalRating = averageRating(items.map((item) => item.rating))

  const movieMinutes = items
    .filter((item) => item.type === 'movie' && item.watchStatus === 'completed')
    .reduce((sum, item) => sum + (item.runtimeMinutes ?? DEFAULT_MOVIE_RUNTIME_MINUTES), 0)
  const episodeMinutes = totalEpisodesWatched * DEFAULT_EPISODE_RUNTIME_MINUTES

  return {
    moviesWatched,
    seriesCompleted,
    animeCompleted,
    totalEpisodesWatched,
    estimatedWatchTimeMinutes: movieMinutes + episodeMinutes,
    averagePersonalRating,
    favoritesCount
  }
}
