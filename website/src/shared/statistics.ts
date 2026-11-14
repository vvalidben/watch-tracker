import { computeDashboardStats, type DashboardStats, type DashboardStatsItem } from './dashboardStats'
import type { LibraryItemDTO, WatchStatus } from './library'
import type { MediaType, MetadataSource } from './metadata'

const ALL_STATUSES: WatchStatus[] = ['plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped']

export interface MonthCount {
  /** "YYYY-MM". */
  month: string
  count: number
}

export interface GenreCount {
  genre: string
  count: number
}

export interface StatusCount {
  status: WatchStatus
  count: number
}

export interface RatedMediaSummary {
  mediaItemId: number
  title: string
  posterPath: string | null
  type: MediaType
  rating: number
  /** For linking through to the detail page — null for a 'manual' entry with no external match. */
  source: MetadataSource | 'manual'
  sourceId: string | null
}

export interface CompletionStats {
  byStatus: StatusCount[]
  /** completed / everything that's been started (i.e. not still plan-to-watch), 0-100. Null if nothing has been started yet. */
  completionRate: number | null
  totalInLibrary: number
}

export interface LibraryStatistics {
  overview: DashboardStats
  /** Highest-rated items, ties broken alphabetically. Empty until something is rated. */
  highestRated: RatedMediaSummary[]
  /** Lowest-rated items, ties broken alphabetically. Empty until something is rated. */
  lowestRated: RatedMediaSummary[]
  /** Episode watch events per month, most recent N months, zero-filled. */
  episodesByMonth: MonthCount[]
  /** Movie watch events per month, most recent N months, zero-filled. */
  moviesByMonth: MonthCount[]
  completion: CompletionStats
  /** Genres of things actually watched (watching/completed), ranked by frequency. */
  favoriteGenres: GenreCount[]
}

export interface GetStatisticsResponse {
  statistics: LibraryStatistics
}

function toRatedSummary(item: LibraryItemDTO): RatedMediaSummary {
  return {
    mediaItemId: item.mediaItem.id,
    title: item.mediaItem.title,
    posterPath: item.mediaItem.posterPath,
    type: item.mediaItem.type,
    // Safe: caller has already filtered to items with a non-null rating.
    rating: item.libraryEntry.rating as number,
    source: item.mediaItem.source,
    sourceId: item.mediaItem.sourceId
  }
}

/** Highest/lowest personally-rated items in the library. Unrated items never appear in either list. */
export function rankRatedItems(
  items: readonly LibraryItemDTO[],
  limit: number
): { highest: RatedMediaSummary[]; lowest: RatedMediaSummary[] } {
  const rated = items.filter((item) => item.libraryEntry.rating !== null).map(toRatedSummary)
  const byTitle = (a: RatedMediaSummary, b: RatedMediaSummary): number => a.title.localeCompare(b.title)

  const highest = [...rated].sort((a, b) => b.rating - a.rating || byTitle(a, b)).slice(0, limit)
  const lowest = [...rated].sort((a, b) => a.rating - b.rating || byTitle(a, b)).slice(0, limit)
  return { highest, lowest }
}

/** How the library breaks down by watch status, plus an overall completion rate. */
export function computeCompletion(items: readonly LibraryItemDTO[]): CompletionStats {
  const byStatus = ALL_STATUSES.map((status) => ({
    status,
    count: items.filter((item) => item.libraryEntry.watchStatus === status).length
  }))

  const started = items.filter((item) => item.libraryEntry.watchStatus !== 'plan_to_watch').length
  const completed = byStatus.find((entry) => entry.status === 'completed')?.count ?? 0
  const completionRate = started > 0 ? Math.round((completed / started) * 100) : null

  return { byStatus, completionRate, totalInLibrary: items.length }
}

/**
 * Genres of things the user has actually engaged with (watching or
 * completed) — a plan-to-watch backlog item hasn't been "favorited" by
 * genre just by sitting in the library.
 */
export function computeFavoriteGenres(items: readonly LibraryItemDTO[], limit: number): GenreCount[] {
  const engaged = items.filter(
    (item) => item.libraryEntry.watchStatus === 'watching' || item.libraryEntry.watchStatus === 'completed'
  )

  const counts = new Map<string, number>()
  for (const item of engaged) {
    for (const genre of item.mediaItem.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
    .slice(0, limit)
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Buckets watch-event timestamps into the most recent `monthsBack` calendar
 * months ending at `referenceDate`'s month, zero-filled so the chart always
 * shows a continuous timeline rather than gaps. Events older than the
 * window are simply not counted — this is a recent-activity trend, not a
 * full-history archive. `referenceDate` is a parameter (not `new Date()`
 * internally) so this stays a pure, deterministically testable function.
 */
export function bucketByMonth(watchedAtDates: readonly string[], monthsBack: number, referenceDate: Date): MonthCount[] {
  const months: MonthCount[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1)
    months.push({ month: monthKey(d), count: 0 })
  }

  const indexByMonth = new Map(months.map((entry, index) => [entry.month, index]))
  for (const iso of watchedAtDates) {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) continue
    const index = indexByMonth.get(monthKey(date))
    if (index !== undefined) months[index].count += 1
  }

  return months
}

const RANK_LIMIT = 5
const GENRE_LIMIT = 8
const MONTHS_BACK = 12

export interface ComputeStatisticsInput {
  items: readonly LibraryItemDTO[]
  totalEpisodesWatched: number
  /** watchedAt of every movie-level watch event (episodeId null) for items currently in the library. */
  movieWatchedAts: readonly string[]
  /** watchedAt of every episode-level watch event for items currently in the library. */
  episodeWatchedAts: readonly string[]
  referenceDate: Date
}

/**
 * The single entry point: combines the library snapshot and watch-event
 * timestamps into every statistic the Statistics page shows. Reuses
 * computeDashboardStats for the overview tiles so the two pages never
 * disagree about what "total episodes watched" means.
 */
export function computeStatistics(input: ComputeStatisticsInput): LibraryStatistics {
  const statsItems: DashboardStatsItem[] = input.items.map((item) => ({
    type: item.mediaItem.type,
    watchStatus: item.libraryEntry.watchStatus,
    rating: item.libraryEntry.rating,
    favorite: item.libraryEntry.favorite,
    runtimeMinutes: null
  }))

  const { highest, lowest } = rankRatedItems(input.items, RANK_LIMIT)

  return {
    overview: computeDashboardStats(statsItems, input.totalEpisodesWatched),
    highestRated: highest,
    lowestRated: lowest,
    episodesByMonth: bucketByMonth(input.episodeWatchedAts, MONTHS_BACK, input.referenceDate),
    moviesByMonth: bucketByMonth(input.movieWatchedAts, MONTHS_BACK, input.referenceDate),
    completion: computeCompletion(input.items),
    favoriteGenres: computeFavoriteGenres(input.items, GENRE_LIMIT)
  }
}
